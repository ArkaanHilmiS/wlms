<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('issue_id');
            $table->uuid('comment_id')->nullable();
            $table->foreignId('uploader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('filename');
            $table->string('file_path');
            $table->unsignedInteger('file_size'); // Size in bytes (max 5MB = 5,242,880)
            $table->string('mime_type', 100);
            $table->timestamps();

            $table->foreign('issue_id')->references('id')->on('issues')->cascadeOnDelete();
            $table->foreign('comment_id')->references('id')->on('issue_comments')->cascadeOnDelete();
            $table->index(['issue_id', 'created_at'], 'idx_issue_attachments_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_attachments');
    }
};

