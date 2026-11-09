using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class AppForgeRestMutationReceiptConfiguration : IEntityTypeConfiguration<AppForgeRestMutationReceipt>
{
    public void Configure(EntityTypeBuilder<AppForgeRestMutationReceipt> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("__AppForgeRestMutationReceipts", table => table.ExcludeFromMigrations(false));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SubjectKey).IsRequired().HasMaxLength(300);
        builder.Property(x => x.EndpointKey).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IdempotencyKey).IsRequired().HasMaxLength(200);
        builder.Property(x => x.RequestFingerprint).IsRequired().HasMaxLength(64);
        builder.Property(x => x.ResponseJson);
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.HasIndex(x => x.CreatedAtUtc)
            .HasDatabaseName("IX___AppForgeRestMutationReceipts_CreatedAtUtc");
        builder.HasIndex(x => new { x.SubjectKey, x.EndpointKey, x.IdempotencyKey })
            .HasDatabaseName("IX___AppForgeRestMutationReceipts_Subject_Endpoint_Idempotency")
            .IsUnique();
    }
}
