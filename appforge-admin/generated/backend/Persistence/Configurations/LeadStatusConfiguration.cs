using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class LeadStatusConfiguration : IEntityTypeConfiguration<LeadStatus>
{
    public void Configure(EntityTypeBuilder<LeadStatus> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("LeadStatuses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Code).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(64);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.Property(x => x.SortOrder).IsRequired();
        builder.ToTable("LeadStatuses", table => table.HasCheckConstraint("CK_LeadStatuses_Code_Standard", "LENGTH(\"Code\") <= 64"));
        builder.ToTable("LeadStatuses", table => table.HasCheckConstraint("CK_LeadStatuses_Name_Standard", "LENGTH(\"Name\") <= 200"));
        builder.HasIndex(x => x.Code)
            .HasDatabaseName("IX_LeadStatuses_Code")
            .IsUnique();
    }
}
