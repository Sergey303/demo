using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;

internal sealed record AdvisoryResult(string Action, string Source, string Status, string Fallback, double Score);
internal sealed record AdvisorySample(int requests, int seconds, int errors, int baseline_rps);

internal sealed class InlineAdvisory(
    string? python, string? script, string? artifacts, int timeoutMs, int thresholdPct,
    int baselineRps, int windowSeconds)
{
    private const int MaxOutputBytes = 2048;
    private const int MaxWindowRequests = 10_000;
    private readonly SemaphoreSlim _worker = new(1, 1);
    private readonly object _windowLock = new();
    private readonly long _start = Stopwatch.GetTimestamp();
    private long _window;
    private int _requests, _errors;
    private long _scored, _fallback, _observed;

    public long Scored => Interlocked.Read(ref _scored);
    public long Fallback => Interlocked.Read(ref _fallback);
    public long Observed => Interlocked.Read(ref _observed);

    private void AdvanceWindow()
    {
        var window = (long)(Stopwatch.GetElapsedTime(_start).TotalSeconds / windowSeconds);
        if (window == _window)
            return;

        _window = window;
        _requests = _errors = 0;
    }

    public void CountRequest(HttpContext context)
    {
        long window;
        lock (_windowLock)
        {
            AdvanceWindow();
            if (_requests == MaxWindowRequests)
                return;

            _requests++;
            window = _window;
        }

        context.Response.OnStarting(() =>
        {
            if (context.Response.StatusCode >= 400)
            {
                lock (_windowLock)
                {
                    AdvanceWindow();
                    if (window == _window)
                        _errors++;
                }
            }
            return Task.CompletedTask;
        });
    }

    public async Task<AdvisoryResult> ScoreAsync(CancellationToken cancellationToken)
    {
        AdvisorySample sample;
        lock (_windowLock)
        {
            AdvanceWindow();
            sample = new AdvisorySample(_requests, windowSeconds, _errors, baselineRps);
        }

        var result = await RunAsync(sample, cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        if (result.Score is double score)
        {
            Interlocked.Increment(ref _scored);
        }
        else
        {
            // Identical to EdgeAI's deterministic rules-only baseline.py.
            // The fallback must NOT yield a different policy under the same window.
            var rps = (double)sample.requests / sample.seconds;
            var ratio = rps / Math.Max(sample.baseline_rps, 1.0);
            var spike = Math.Clamp((ratio - 1.5) / 8.5, 0.0, 1.0);
            var errorRate = (double)sample.errors / Math.Max(1, sample.requests);
            score = Math.Round(Math.Min(1.0, 0.7 * spike + 0.3 * errorRate),
                6, MidpointRounding.ToEven);
            Interlocked.Increment(ref _fallback);
        }

        var action = score >= thresholdPct / 100.0 ? "observe" : "allow";
        if (action == "observe")
            Interlocked.Increment(ref _observed);
        return new AdvisoryResult(action, result.Source, "simulated", result.Fallback, score);
    }

    private async Task<(double? Score, string Source, string Fallback)> RunAsync(
        AdvisorySample sample, CancellationToken cancellationToken)
    {
        if (python is null || script is null || artifacts is null || !_worker.Wait(0))
            return (null, "rule-only", "unavailable");

        try
        {
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            deadline.CancelAfter(timeoutMs);
            var token = deadline.Token;
            using var child = new Process
            {
                StartInfo = new ProcessStartInfo(python)
                {
                    UseShellExecute = false,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                },
            };
            // No host credentials, proxies or account-related environment may reach
            // the optional subprocess. Python's -I ignores user site packages.
            child.StartInfo.Environment.Clear();
            child.StartInfo.Environment["OMP_NUM_THREADS"] = "1";
            child.StartInfo.Environment["OPENBLAS_NUM_THREADS"] = "1";
            foreach (var arg in new[] { "-I", "-B", script, "--artifact-dir", artifacts, "--timeout-ms",
                         Math.Min(timeoutMs, 2500).ToString(CultureInfo.InvariantCulture), "--threshold",
                         (thresholdPct / 100.0).ToString("0.##", CultureInfo.InvariantCulture) })
                child.StartInfo.ArgumentList.Add(arg);

            try
            {
                token.ThrowIfCancellationRequested();
                child.Start();
                var discard = child.StandardError.BaseStream.CopyToAsync(Stream.Null, token);
                try
                {
                    await child.StandardInput.BaseStream.WriteAsync(JsonSerializer.SerializeToUtf8Bytes(sample), token);
                    child.StandardInput.Close();
                    var output = await ReadOutputAsync(child.StandardOutput.BaseStream, token);
                    await child.WaitForExitAsync(token);
                    await discard;
                    token.ThrowIfCancellationRequested();
                    if (child.ExitCode != 0)
                        return (null, "rule-only", "unavailable");

                    return Parse(output);
                }
                finally
                {
                    try
                    {
                        if (!child.HasExited)
                            child.Kill(entireProcessTree: true);
                    }
                    catch (InvalidOperationException) when (child.HasExited)
                    {
                        // The worker exited between the check and kill.
                    }
                    finally
                    {
                        await child.WaitForExitAsync(CancellationToken.None);
                        await deadline.CancelAsync();
                        try { await discard; }
                        catch (OperationCanceledException) { }
                        catch (IOException) { }
                    }
                }
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return (null, "rule-only", "timeout");
            }
            catch (Exception error) when (error is Win32Exception or IOException or JsonException
                                          or InvalidOperationException or ArgumentException)
            {
                return (null, "rule-only", "unavailable");
            }
        }
        finally
        {
            _worker.Release();
        }
    }

    private static async Task<ReadOnlyMemory<byte>> ReadOutputAsync(Stream stream, CancellationToken token)
    {
        var bytes = new byte[MaxOutputBytes];
        var count = 0;
        while (count < bytes.Length)
        {
            var read = await stream.ReadAsync(bytes.AsMemory(count), token);
            if (read == 0)
                return bytes.AsMemory(0, count);
            count += read;
        }

        var extra = new byte[1];
        if (await stream.ReadAsync(extra, token) != 0)
            throw new IOException("Advisory output exceeded its byte limit.");
        return bytes;
    }

    private static (double? Score, string Source, string Fallback) Parse(ReadOnlyMemory<byte> output)
    {
        using var document = JsonDocument.Parse(output, new JsonDocumentOptions { MaxDepth = 2 });
        var obj = document.RootElement;
        if (obj.ValueKind != JsonValueKind.Object)
            return (null, "rule-only", "unavailable");

        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var property in obj.EnumerateObject())
        {
            if (property.Name is not ("schema_version" or "action" or "source" or "score" or
                "fallback" or "status" or "policy_id") || !keys.Add(property.Name))
                return (null, "rule-only", "unavailable");
        }

        if (keys.Count != 7 || !obj.GetProperty("schema_version").TryGetInt32(out var version) || version != 1 ||
            obj.GetProperty("action").GetString() is not ("allow" or "observe") ||
            obj.GetProperty("source").GetString() is not ("onnx-cpu" or "rule-only") ||
            obj.GetProperty("status").GetString() != "simulated" ||
            obj.GetProperty("policy_id").GetString() != "demo-policy-v1" ||
            !obj.GetProperty("score").TryGetDouble(out var score) || !double.IsFinite(score) || score < 0 || score > 1)
            return (null, "rule-only", "unavailable");

        return obj.GetProperty("fallback").GetString() switch
        {
            "none" => (score, obj.GetProperty("source").GetString()!, "none"),
            "timeout" => (null, "rule-only", "timeout"),
            _ => (null, "rule-only", "unavailable"),
        };
    }
}
