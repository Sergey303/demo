using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.BusinessOperations.Persistence.Configurations;

public sealed class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Permissions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Code).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(200);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.ToTable("Permissions", table => table.HasCheckConstraint("CK_Permissions_Code_Standard", "LENGTH(\"Code\") <= 200"));
        builder.ToTable("Permissions", table => table.HasCheckConstraint("CK_Permissions_Name_Standard", "LENGTH(\"Name\") <= 200"));
        builder.HasIndex(x => x.Code)
            .HasDatabaseName("IX_Permissions_Code")
            .IsUnique();
    }
}
