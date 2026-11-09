using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.BusinessOperations.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Customers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(180);
        builder.Property(x => x.Email).HasMaxLength(180);
        builder.Property(x => x.Segment).HasMaxLength(90);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.ToTable("Customers", table => table.HasCheckConstraint("CK_Customers_Name_Standard", "LENGTH(\"Name\") <= 180"));
        builder.ToTable("Customers", table => table.HasCheckConstraint("CK_Customers_Email_Standard", "\"Email\" IS NULL OR (LENGTH(\"Email\") <= 180)"));
        builder.ToTable("Customers", table => table.HasCheckConstraint("CK_Customers_Segment_Standard", "\"Segment\" IS NULL OR (LENGTH(\"Segment\") <= 90)"));
        builder.ToTable("Customers", table => table.HasCheckConstraint("CK_Customers_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 500)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_Customers_IsDeleted");
        builder.Property(x => x.NameSearch).IsRequired();
        builder.Property(x => x.NameSearch).HasMaxLength(180);
        builder.Property(x => x.EmailSearch).IsRequired();
        builder.Property(x => x.EmailSearch).HasMaxLength(180);
        builder.Property(x => x.SegmentSearch).IsRequired();
        builder.Property(x => x.SegmentSearch).HasMaxLength(90);
        builder.Property(x => x.NoteSearch).IsRequired();
        builder.Property(x => x.NoteSearch).HasMaxLength(500);
        builder.HasIndex(x => x.Name)
            .HasDatabaseName("IX_Customers_Name");
        builder.HasIndex(x => x.Email)
            .HasDatabaseName("IX_Customers_Email");
        builder.HasIndex(x => x.NameSearch)
            .HasDatabaseName("IX_Customers_NameSearch");
        builder.HasIndex(x => x.EmailSearch)
            .HasDatabaseName("IX_Customers_EmailSearch");
        builder.HasIndex(x => x.SegmentSearch)
            .HasDatabaseName("IX_Customers_SegmentSearch");
        builder.HasIndex(x => x.NoteSearch)
            .HasDatabaseName("IX_Customers_NoteSearch");
    }
}
