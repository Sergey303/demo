using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Leads");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.SubscriberId).IsRequired();
        builder.Property(x => x.Subject).IsRequired();
        builder.Property(x => x.Subject).HasMaxLength(200);
        builder.Property(x => x.StatusId).IsRequired();
        builder.Property(x => x.Owner).HasMaxLength(120);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(1000);
        builder.ToTable("Leads", table => table.HasCheckConstraint("CK_Leads_Subject_Standard", "LENGTH(\"Subject\") <= 200"));
        builder.ToTable("Leads", table => table.HasCheckConstraint("CK_Leads_Owner_Standard", "\"Owner\" IS NULL OR (LENGTH(\"Owner\") <= 120)"));
        builder.ToTable("Leads", table => table.HasCheckConstraint("CK_Leads_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 1000)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_Leads_IsDeleted");
        builder.Property(x => x.SubjectSearch).IsRequired();
        builder.Property(x => x.SubjectSearch).HasMaxLength(200);
        builder.Property(x => x.OwnerSearch).IsRequired();
        builder.Property(x => x.OwnerSearch).HasMaxLength(120);
        builder.Property(x => x.NoteSearch).IsRequired();
        builder.Property(x => x.NoteSearch).HasMaxLength(1000);
        builder.HasOne(x => x.Subscriber)
            .WithMany(x => x.Leads)
            .HasForeignKey(x => x.SubscriberId)
            .IsRequired();
        builder.HasOne(x => x.Status)
            .WithMany()
            .HasForeignKey(x => x.StatusId)
            .IsRequired();
        builder.HasIndex(x => x.SubscriberId)
            .HasDatabaseName("IX_Leads_SubscriberId");
        builder.HasIndex(x => x.StatusId)
            .HasDatabaseName("IX_Leads_Status");
        builder.HasIndex(x => x.SubjectSearch)
            .HasDatabaseName("IX_Leads_SubjectSearch");
        builder.HasIndex(x => x.OwnerSearch)
            .HasDatabaseName("IX_Leads_OwnerSearch");
        builder.HasIndex(x => x.NoteSearch)
            .HasDatabaseName("IX_Leads_NoteSearch");
    }
}
