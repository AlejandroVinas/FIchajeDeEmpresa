using FichajeDeEmpresa.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FichajeDeEmpresa.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<UserEntity> Users => Set<UserEntity>();

    public DbSet<FichajeRecordEntity> FichajeRecords => Set<FichajeRecordEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.FullName)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(x => x.UserName)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Password)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Role)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(x => x.ExpectedDailyHours)
                .HasPrecision(5, 2);

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);

            entity.HasIndex(x => x.UserName)
                .IsUnique();

            entity.HasData(
                new UserEntity
                {
                    Id = 1,
                    FullName = "Administrador",
                    UserName = "admin",
                    Password = "admin",
                    Role = "Admin",
                    ExpectedDailyHours = 8m,
                    IsActive = true,
                    CreatedAtUtc = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new UserEntity
                {
                    Id = 2,
                    FullName = "Usuario",
                    UserName = "user",
                    Password = "user",
                    Role = "User",
                    ExpectedDailyHours = 8m,
                    IsActive = true,
                    CreatedAtUtc = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });
        });

        modelBuilder.Entity<FichajeRecordEntity>(entity =>
        {
            entity.ToTable("FichajeRecords");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Type)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(x => x.Comment)
                .HasMaxLength(500);

            entity.HasIndex(x => new { x.UserId, x.Timestamp });

            entity.HasOne(x => x.User)
                .WithMany(x => x.FichajeRecords)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}