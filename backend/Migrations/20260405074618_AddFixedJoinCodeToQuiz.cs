using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kweez.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFixedJoinCodeToQuiz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FixedJoinCode",
                table: "Quizzes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FixedJoinCode",
                table: "Quizzes");
        }
    }
}
