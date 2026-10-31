using System.Security.Cryptography;
using System.Text;

namespace ReliableJobs;

/// <summary>Pure, deterministic application logic: independently testable without PostgreSQL.</summary>
public static class JobLogic
{
    public static string PayloadHash(string text) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));

    public static JobResult Process(string text)
    {
        var words = text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
        return new JobResult(words, PayloadHash(text));
    }
}

public sealed record JobResult(int WordCount, string Sha256);

/// <summary>Bounded retry delay; 1-based attempt count, with a configurable maximum.</summary>
public static class RetryPolicy
{
    public const int MaxAttempts = 5;

    public static TimeSpan Delay(int attempt)
    {
        if (attempt < 1) throw new ArgumentOutOfRangeException(nameof(attempt));
        return TimeSpan.FromSeconds(Math.Min(60, Math.Pow(2, Math.Min(attempt - 1, 30))));
    }
}
