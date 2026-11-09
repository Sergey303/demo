using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Campaigns");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(160);
        builder.Property(x => x.AudienceDescription).IsRequired();
        builder.Property(x => x.AudienceDescription).HasMaxLength(300);
        builder.Property(x => x.MessageTemplate).IsRequired();
        builder.Property(x => x.MessageTemplate).HasMaxLength(2000);
        builder.Property(x => x.StatusId).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.ToTable("Campaigns", table => table.HasCheckConstraint("CK_Campaigns_Name_Standard", "LENGTH(\"Name\") <= 160"));
        builder.ToTable("Campaigns", table => table.HasCheckConstraint("CK_Campaigns_AudienceDescription_Standard", "LENGTH(\"AudienceDescription\") <= 300"));
        builder.ToTable("Campaigns", table => table.HasCheckConstraint("CK_Campaigns_MessageTemplate_Standard", "LENGTH(\"MessageTemplate\") <= 2000"));
        builder.ToTable("Campaigns", table => table.HasCheckConstraint("CK_Campaigns_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 500)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_Campaigns_IsDeleted");
        builder.Property(x => x.NameSearch).IsRequired();
        builder.Property(x => x.NameSearch).HasMaxLength(160);
        builder.Property(x => x.AudienceDescriptionSearch).IsRequired();
        builder.Property(x => x.AudienceDescriptionSearch).HasMaxLength(300);
        builder.Property(x => x.MessageTemplateSearch).IsRequired();
        builder.Property(x => x.MessageTemplateSearch).HasMaxLength(2000);
        builder.Property(x => x.NoteSearch).IsRequired();
        builder.Property(x => x.NoteSearch).HasMaxLength(500);
        builder.HasOne(x => x.Status)
            .WithMany()
            .HasForeignKey(x => x.StatusId)
            .IsRequired();
        builder.HasIndex(x => x.Name)
            .HasDatabaseName("IX_Campaigns_Name");
        builder.HasIndex(x => x.StatusId)
            .HasDatabaseName("IX_Campaigns_Status");
        builder.HasIndex(x => x.NameSearch)
            .HasDatabaseName("IX_Campaigns_NameSearch");
        builder.HasIndex(x => x.AudienceDescriptionSearch)
            .HasDatabaseName("IX_Campaigns_AudienceDescriptionSearch");
        builder.HasIndex(x => x.MessageTemplateSearch)
            .HasDatabaseName("IX_Campaigns_MessageTemplateSearch");
        builder.HasIndex(x => x.NoteSearch)
            .HasDatabaseName("IX_Campaigns_NoteSearch");
    }
}
