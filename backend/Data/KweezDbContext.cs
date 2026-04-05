using Kweez.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kweez.Api.Data;

public class KweezDbContext : DbContext
{
    public KweezDbContext(DbContextOptions<KweezDbContext> options) : base(options)
    {
    }

    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<AnswerOption> AnswerOptions => Set<AnswerOption>();
    public DbSet<QuizSession> QuizSessions => Set<QuizSession>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<ParticipantAnswer> ParticipantAnswers => Set<ParticipantAnswer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Quiz
        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
        });

        // Question
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(500);
            entity.HasOne(e => e.Quiz)
                  .WithMany(q => q.Questions)
                  .HasForeignKey(e => e.QuizId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // AnswerOption
        modelBuilder.Entity<AnswerOption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Question)
                  .WithMany(q => q.AnswerOptions)
                  .HasForeignKey(e => e.QuestionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // QuizSession
        modelBuilder.Entity<QuizSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.JoinCode).IsRequired().HasMaxLength(10);
            entity.HasIndex(e => e.JoinCode).IsUnique();
            entity.HasOne(e => e.Quiz)
                  .WithMany(q => q.Sessions)
                  .HasForeignKey(e => e.QuizId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Participant
        modelBuilder.Entity<Participant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.HasOne(e => e.Session)
                  .WithMany(s => s.Participants)
                  .HasForeignKey(e => e.SessionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ParticipantAnswer
        modelBuilder.Entity<ParticipantAnswer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Participant)
                  .WithMany(p => p.Answers)
                  .HasForeignKey(e => e.ParticipantId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Question)
                  .WithMany()
                  .HasForeignKey(e => e.QuestionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.AnswerOption)
                  .WithMany()
                  .HasForeignKey(e => e.AnswerOptionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ParticipantId, e.QuestionId }).IsUnique();
        });
    }
}
