using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kweez.Api.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteParticipantAnswers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticipantAnswers_AnswerOptions_AnswerOptionId",
                table: "ParticipantAnswers");

            migrationBuilder.DropForeignKey(
                name: "FK_ParticipantAnswers_Questions_QuestionId",
                table: "ParticipantAnswers");

            migrationBuilder.AddForeignKey(
                name: "FK_ParticipantAnswers_AnswerOptions_AnswerOptionId",
                table: "ParticipantAnswers",
                column: "AnswerOptionId",
                principalTable: "AnswerOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParticipantAnswers_Questions_QuestionId",
                table: "ParticipantAnswers",
                column: "QuestionId",
                principalTable: "Questions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticipantAnswers_AnswerOptions_AnswerOptionId",
                table: "ParticipantAnswers");

            migrationBuilder.DropForeignKey(
                name: "FK_ParticipantAnswers_Questions_QuestionId",
                table: "ParticipantAnswers");

            migrationBuilder.AddForeignKey(
                name: "FK_ParticipantAnswers_AnswerOptions_AnswerOptionId",
                table: "ParticipantAnswers",
                column: "AnswerOptionId",
                principalTable: "AnswerOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ParticipantAnswers_Questions_QuestionId",
                table: "ParticipantAnswers",
                column: "QuestionId",
                principalTable: "Questions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
