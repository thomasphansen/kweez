using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kweez.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionAndAnswerTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create QuestionTranslations table
            migrationBuilder.CreateTable(
                name: "QuestionTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionTranslations_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionTranslations_QuestionId_LanguageCode",
                table: "QuestionTranslations",
                columns: new[] { "QuestionId", "LanguageCode" },
                unique: true);

            // Create AnswerOptionTranslations table
            migrationBuilder.CreateTable(
                name: "AnswerOptionTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnswerOptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Text = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnswerOptionTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnswerOptionTranslations_AnswerOptions_AnswerOptionId",
                        column: x => x.AnswerOptionId,
                        principalTable: "AnswerOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnswerOptionTranslations_AnswerOptionId_LanguageCode",
                table: "AnswerOptionTranslations",
                columns: new[] { "AnswerOptionId", "LanguageCode" },
                unique: true);

            // Migrate existing Question.Text to QuestionTranslations using quiz's default language
            // For quizzes without a default language, fall back to 'en'
            migrationBuilder.Sql(@"
                INSERT INTO ""QuestionTranslations"" (""Id"", ""QuestionId"", ""LanguageCode"", ""Text"")
                SELECT 
                    gen_random_uuid(),
                    q.""Id"",
                    COALESCE(
                        (SELECT ql.""LanguageCode"" 
                         FROM ""QuizLanguages"" ql 
                         WHERE ql.""QuizId"" = q.""QuizId"" AND ql.""IsDefault"" = true 
                         LIMIT 1),
                        'en'
                    ),
                    q.""Text""
                FROM ""Questions"" q
                WHERE q.""Text"" IS NOT NULL AND q.""Text"" != '';
            ");

            // Migrate existing AnswerOption.Text to AnswerOptionTranslations using quiz's default language
            migrationBuilder.Sql(@"
                INSERT INTO ""AnswerOptionTranslations"" (""Id"", ""AnswerOptionId"", ""LanguageCode"", ""Text"")
                SELECT 
                    gen_random_uuid(),
                    ao.""Id"",
                    COALESCE(
                        (SELECT ql.""LanguageCode"" 
                         FROM ""QuizLanguages"" ql 
                         INNER JOIN ""Questions"" q ON q.""QuizId"" = ql.""QuizId""
                         WHERE q.""Id"" = ao.""QuestionId"" AND ql.""IsDefault"" = true 
                         LIMIT 1),
                        'en'
                    ),
                    ao.""Text""
                FROM ""AnswerOptions"" ao
                WHERE ao.""Text"" IS NOT NULL AND ao.""Text"" != '';
            ");

            // Drop old Text columns
            migrationBuilder.DropColumn(
                name: "Text",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Text",
                table: "AnswerOptions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-add Text columns
            migrationBuilder.AddColumn<string>(
                name: "Text",
                table: "Questions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Text",
                table: "AnswerOptions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            // Migrate translations back to original columns (using first available translation)
            migrationBuilder.Sql(@"
                UPDATE ""Questions"" q
                SET ""Text"" = COALESCE(
                    (SELECT qt.""Text"" 
                     FROM ""QuestionTranslations"" qt 
                     WHERE qt.""QuestionId"" = q.""Id"" 
                     LIMIT 1),
                    ''
                );
            ");

            migrationBuilder.Sql(@"
                UPDATE ""AnswerOptions"" ao
                SET ""Text"" = COALESCE(
                    (SELECT aot.""Text"" 
                     FROM ""AnswerOptionTranslations"" aot 
                     WHERE aot.""AnswerOptionId"" = ao.""Id"" 
                     LIMIT 1),
                    ''
                );
            ");

            // Drop translation tables
            migrationBuilder.DropTable(
                name: "AnswerOptionTranslations");

            migrationBuilder.DropTable(
                name: "QuestionTranslations");
        }
    }
}
