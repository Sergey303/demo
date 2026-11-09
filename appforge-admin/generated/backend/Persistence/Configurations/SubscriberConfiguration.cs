using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.TelegramOperations.Persistence.Configurations;

public sealed class SubscriberConfiguration : IEntityTypeConfiguration<Subscriber>
{
    public void Configure(EntityTypeBuilder<Subscriber> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Subscribers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Handle).IsRequired();
        builder.Property(x => x.Handle).HasMaxLength(80);
        builder.Property(x => x.DisplayName).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(200);
        builder.Property(x => x.StatusId).IsRequired();
        builder.Property(x => x.JoinedAt).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.ToTable("Subscribers", table => table.HasCheckConstraint("CK_Subscribers_Handle_Standard", "LENGTH(\"Handle\") <= 80"));
        builder.ToTable("Subscribers", table => table.HasCheckConstraint("CK_Subscribers_DisplayName_Standard", "LENGTH(\"DisplayName\") <= 200"));
        builder.ToTable("Subscribers", table => table.HasCheckConstraint("CK_Subscribers_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 500)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_Subscribers_IsDeleted");
        builder.Property(x => x.HandleSearch).IsRequired();
        builder.Property(x => x.HandleSearch).HasMaxLength(80);
        builder.Property(x => x.DisplayNameSearch).IsRequired();
        builder.Property(x => x.DisplayNameSearch).HasMaxLength(200);
        builder.Property(x => x.NoteSearch).IsRequired();
        builder.Property(x => x.NoteSearch).HasMaxLength(500);
        builder.HasOne(x => x.Status)
            .WithMany()
            .HasForeignKey(x => x.StatusId)
            .IsRequired();
        builder.HasIndex(x => x.Handle)
            .HasDatabaseName("IX_Subscribers_Handle")
            .IsUnique();
        builder.HasIndex(x => x.StatusId)
            .HasDatabaseName("IX_Subscribers_Status");
        builder.HasIndex(x => x.HandleSearch)
            .HasDatabaseName("IX_Subscribers_HandleSearch");
        builder.HasIndex(x => x.DisplayNameSearch)
            .HasDatabaseName("IX_Subscribers_DisplayNameSearch");
        builder.HasIndex(x => x.NoteSearch)
            .HasDatabaseName("IX_Subscribers_NoteSearch");
    }
}
