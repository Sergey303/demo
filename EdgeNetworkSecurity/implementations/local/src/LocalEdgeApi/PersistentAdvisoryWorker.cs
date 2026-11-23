using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;

internal sealed class PersistentAdvisoryWorker(ProcessStartInfo? startInfo, int startupMs, int scoringMs)
    : IAsyncDisposable
{
    private static readonly TimeSpan Cooldown = TimeSpan.FromMilliseconds(750);
    private const int MaxLineBytes = 2048;
    private static readonly byte[] Newline = [(byte)'\n'];
    private readonly SemaphoreSlim _slot = new(1, 1);
    private readonly byte[] _response = new byte[MaxLineBytes + 1];
    private readonly object _readinessLock = new();
    private Process? _readyProcess;
    private Process? _process;
    private CancellationTokenSource? _stderrStop;
    private Task? _stderrDrain;
    private long? _lastFailure;
    private long _starts;
    private long _prewarmAttempts;
    private long _prewarmFailures;
    private volatile bool _stopping;

    public long Restarts => Math.Max(0, Interlocked.Read(ref _starts) - 1);

    public long PrewarmAttempts => Interlocked.Read(ref _prewarmAttempts);
    public long PrewarmFailures => Interlocked.Read(ref _prewarmFailures);
    public bool IsReady
    {
        get
        {
            lock (_readinessLock)
                return !_stopping && _readyProcess is { HasExited: false };
        }
    }

    private bool InCooldown =>
        _lastFailure is long failure && Stopwatch.GetElapsedTime(failure) < Cooldown;

    public async Task<bool> PrewarmAsync(CancellationToken cancellationToken)
    {
        if (_stopping || cancellationToken.IsCancellationRequested || !_slot.Wait(0))
            return false;

        var ready = false;
        try
        {
            if (_stopping || cancellationToken.IsCancellationRequested)
                return false;
            if (_process is not null || PrewarmAttempts != 0 || InCooldown)
                return IsReady;

            Interlocked.Increment(ref _prewarmAttempts);
            try
            {
                if (startInfo is null)
                    return false;
                await StartAsync(startInfo, cancellationToken);
                ready = true;
                return true;
            }
            catch (Exception error) when (error is OperationCanceledException or Win32Exception or IOException
                                          or JsonException or InvalidOperationException or ArgumentException)
            {
                await FailAsync();
                return false;
            }
            finally
            {
                if (!ready)
                    Interlocked.Increment(ref _prewarmFailures);
            }
        }
        finally
        {
            // Publish readiness only when HTTP scoring can acquire the slot.
            lock (_readinessLock)
            {
                if (ready)
                    _readyProcess = _process;
                _slot.Release();
            }
        }
    }

    public async Task<(double? Score, string Source, string Fallback)> ScoreAsync(
        AdvisorySample sample, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (startInfo is null || _stopping || !_slot.Wait(0))
            return (null, "rule-only", "unavailable");

        try
        {
            if (_stopping || InCooldown)
                return (null, "rule-only", "unavailable");

            if (_process is null)
            {
                await StartAsync(startInfo, cancellationToken);
                lock (_readinessLock)
                    _readyProcess = _process;
            }
            var process = _process!;
            if (process.HasExited)
                throw new IOException("Advisory worker exited.");

            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            deadline.CancelAfter(scoringMs);
            var token = deadline.Token;
            // The four Int32 fields have a fixed upper bound well below 4096 bytes.
            var input = JsonSerializer.SerializeToUtf8Bytes(sample);
            var pipe = process.StandardInput.BaseStream;
            await pipe.WriteAsync(input, token);
            await pipe.WriteAsync(Newline, token);
            await pipe.FlushAsync(token);
            var output = await ReadLineAsync(process.StandardOutput.BaseStream, token);
            var result = InlineAdvisory.Parse(output, requireOnnx: true);
            token.ThrowIfCancellationRequested();
            if (result.Score is null || process.HasExited)
                throw new IOException("Invalid advisory worker response.");
            return result;
        }
        catch (OperationCanceledException)
        {
            await FailAsync();
            cancellationToken.ThrowIfCancellationRequested();
            return (null, "rule-only", "timeout");
        }
        catch (Exception error) when (error is Win32Exception or IOException or JsonException
                                      or InvalidOperationException or ArgumentException)
        {
            await FailAsync();
            cancellationToken.ThrowIfCancellationRequested();
            return (null, "rule-only", "unavailable");
        }
        finally
        {
            _slot.Release();
        }
    }

    private async Task StartAsync(ProcessStartInfo info, CancellationToken cancellationToken)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(startupMs);
        var token = deadline.Token;
        token.ThrowIfCancellationRequested();

        _process = Process.Start(info) ?? throw new IOException("Advisory worker did not start.");
        Interlocked.Increment(ref _starts);
        _stderrStop = new CancellationTokenSource();
        _stderrDrain = _process.StandardError.BaseStream.CopyToAsync(Stream.Null, 4096, _stderrStop.Token);
        var output = await ReadLineAsync(_process.StandardOutput.BaseStream, token);
        using var document = JsonDocument.Parse(output, new JsonDocumentOptions { MaxDepth = 2 });
        var ready = document.RootElement;
        // Exactly three properties and all three named fields rules out duplicates.
        if (ready.ValueKind != JsonValueKind.Object || ready.EnumerateObject().Count() != 3 ||
            !ready.TryGetProperty("schema_version", out var version) || !version.TryGetInt32(out var value) || value != 1 ||
            !ready.TryGetProperty("kind", out var kind) || kind.GetString() != "ready" ||
            !ready.TryGetProperty("model", out var model) || model.GetString() != "onnx-cpu")
            throw new IOException("Invalid advisory worker handshake.");
        token.ThrowIfCancellationRequested();
        if (_process.HasExited)
            throw new IOException("Advisory worker exited during startup.");
    }

    private async Task<ReadOnlyMemory<byte>> ReadLineAsync(Stream pipe, CancellationToken token)
    {
        var count = 0;
        while (count < _response.Length)
        {
            var read = await pipe.ReadAsync(_response.AsMemory(count), token);
            if (read == 0)
                throw new IOException("Advisory worker closed stdout.");
            var end = Array.IndexOf(_response, (byte)'\n', count, read);
            count += read;
            if (end == count - 1)
                return _response.AsMemory(0, end);
            if (end >= 0)
                throw new IOException("Unsolicited advisory worker output.");
        }
        throw new IOException("Advisory worker output exceeded its byte limit.");
    }

    private async Task FailAsync()
    {
        await StopAsync();
        _lastFailure = Stopwatch.GetTimestamp();
    }

    private async Task StopAsync()
    {
        if (_process is not { } process)
            return;

        lock (_readinessLock)
            _readyProcess = null;

        try
        {
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException) when (process.HasExited)
            {
                // The process exited between the check and kill.
            }
            await process.WaitForExitAsync(CancellationToken.None);
        }
        finally
        {
            if (_stderrStop is not null)
            {
                await _stderrStop.CancelAsync();
                try { await _stderrDrain!; }
                catch (OperationCanceledException) { }
                catch (IOException) { }
                _stderrStop.Dispose();
                _stderrStop = null;
                _stderrDrain = null;
            }
            // Process leaves externally accessed standard streams open.
            process.StandardInput.BaseStream.Dispose();
            process.StandardOutput.Dispose();
            process.StandardError.Dispose();
            process.Dispose();
            _process = null;
        }
    }

    public async ValueTask DisposeAsync()
    {
        _stopping = true;
        await _slot.WaitAsync();
        try { await StopAsync(); }
        finally { _slot.Release(); }
    }
}
