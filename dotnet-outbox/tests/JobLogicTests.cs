using Xunit;
using ReliableJobs;

namespace ReliableJobs.Tests;

public class JobLogicTests
{
    [Fact]
    public void SameInputProducesSameFingerprintAndResult()
    {
        var first = JobLogic.Process("  alpha  beta\n gamma ");
        var second = JobLogic.Process("  alpha  beta\n gamma ");
        Assert.Equal(first, second);
        Assert.Equal(3, first.WordCount);
        Assert.Equal(64, first.Sha256.Length);
    }

    [Fact]
    public void IdempotencyPayloadHashDetectsChangedPayload()
    {
        Assert.NotEqual(JobLogic.PayloadHash("report A"), JobLogic.PayloadHash("report B"));
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 2)]
    [InlineData(3, 4)]
    [InlineData(5, 16)]
    [InlineData(15, 60)]
    public void RetriesAreExponentialAndBounded(int attempt, int expectedSeconds) =>
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), RetryPolicy.Delay(attempt));

    [Fact]
    public void InvalidAttemptIsRejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => RetryPolicy.Delay(0));
}
