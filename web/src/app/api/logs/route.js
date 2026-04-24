import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'master') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const linesCount = parseInt(searchParams.get('lines')) || 50;
  
  // Robust path resolution
  let logPath = process.env.LOG_FILE_PATH;
  
  if (!logPath) {
    // Try multiple common locations relative to the running process
    const possiblePaths = [
      path.join(process.cwd(), '..', 'data', 'feed_bot.log'), // Standard deployment (from web/)
      path.join(process.cwd(), 'data', 'feed_bot.log'),      // If started from root
      path.join(process.cwd(), '..', '..', 'data', 'feed_bot.log'), // Some build environments
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        logPath = p;
        break;
      }
    }
    
    // Fallback if none found
    if (!logPath) logPath = possiblePaths[0];
  }

  try {
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ 
        logs: ["Log file not found at " + logPath],
        debug: {
          cwd: process.cwd(),
          envPath: process.env.LOG_FILE_PATH || "not set"
        }
      });
    }

    // EFFICIENT READING: Only read the end of the file
    // This prevents memory issues with huge log files
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    const CHUNK_SIZE = 64 * 1024; // 64KB should be enough for the last N lines
    const readSize = Math.min(fileSize, CHUNK_SIZE);
    
    const buffer = Buffer.alloc(readSize);
    const fd = fs.openSync(logPath, 'r');
    
    try {
      fs.readSync(fd, buffer, 0, readSize, fileSize - readSize);
    } finally {
      fs.closeSync(fd);
    }

    const content = buffer.toString('utf8');
    const allLines = content.split('\n');
    
    // If the file was larger than our chunk, the first line might be partial
    const completeLines = fileSize > CHUNK_SIZE ? allLines.slice(1) : allLines;
    const lastLines = completeLines.slice(-linesCount);

    return NextResponse.json({ 
      logs: lastLines.length > 0 ? lastLines : ["Log file exists but is empty."],
      path: logPath 
    });
  } catch (error) {
    console.error("[API Logs] Error:", error);
    return NextResponse.json({ 
      error: "Failed to read logs", 
      details: error.message,
      path: logPath
    }, { status: 500 });
  }
}
