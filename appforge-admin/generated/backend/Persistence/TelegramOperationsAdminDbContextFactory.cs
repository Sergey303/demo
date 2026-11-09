using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Demo.TelegramOperations.Persistence;

public sealed class TelegramOperationsAdminDbContextFactory : IDesignTimeDbContextFactory<TelegramOperationsAdminDbContext>
{
    public TelegramOperationsAdminDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("APPFORGE_EF_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=telegram_operations_admin;Username=appforge";
        var options = new DbContextOptionsBuilder<TelegramOperationsAdminDbContext>();
        options.UseNpgsql(connectionString);

        return new TelegramOperationsAdminDbContext(options.Options);
    }
}
