using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class CampaignStatusConfiguration : IEntityTypeConfiguration<CampaignStatus>
{
    public void Configure(EntityTypeBuilder<CampaignStatus> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("CampaignStatuses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Code).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(64);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.Property(x => x.SortOrder).IsRequired();
        builder.ToTable("CampaignStatuses", table => table.HasCheckConstraint("CK_CampaignStatuses_Code_Standard", "LENGTH(\"Code\") <= 64"));
        builder.ToTable("CampaignStatuses", table => table.HasCheckConstraint("CK_CampaignStatuses_Name_Standard", "LENGTH(\"Name\") <= 200"));
        builder.HasIndex(x => x.Code)
            .HasDatabaseName("IX_CampaignStatuses_Code")
            .IsUnique();
    }
}
