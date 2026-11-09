using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Demo.BusinessOperations.Persistence;

public sealed class BusinessOperationsAdminDbContextFactory : IDesignTimeDbContextFactory<BusinessOperationsAdminDbContext>
{
    public BusinessOperationsAdminDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("APPFORGE_EF_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=business_operations_admin;Username=appforge";
        var options = new DbContextOptionsBuilder<BusinessOperationsAdminDbContext>();
        options.UseNpgsql(connectionString);

        return new BusinessOperationsAdminDbContext(options.Options);
    }
}
