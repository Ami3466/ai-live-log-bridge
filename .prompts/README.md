# Prompt Files for AI Terminal Bridge

⚠️ **Note:** These files are only needed for **CLI Mode**. If you're using **MCP Mode** (recommended), you don't need these files at all!

---

## MCP Mode vs CLI Mode

### 🎯 MCP Mode (Recommended - No Files Needed)

If your AI tool supports MCP (Model Context Protocol), you don't need any of these files!

**Supported tools:** Claude Desktop, Claude Code, Cursor, Windsurf, and many others.

**Setup:**
1. Configure the MCP server in your AI tool (see main README.md)
2. That's it! The MCP server automatically guides your AI to use `ai` wrapper.

**Benefits:**
- ✅ No prompt files needed
- ✅ Automatic guidance through MCP
- ✅ Four powerful MCP tools available
- ✅ Self-documenting

### CLI Mode (Alternative - Requires These Files)

Only use these files if your AI tool doesn't support MCP yet.

**Tools that need CLI mode:** Aider, Continue (older versions), or any AI without MCP support.

---

## Files in This Folder

### `ai-wrapper.md` (CLI Mode Only)
**Purpose:** Instructs your AI to always use the `ai` wrapper for terminal commands.

**Who needs this:** Only CLI mode users (Aider, Continue, etc.)

**Who doesn't need this:** MCP mode users (Claude Code, Cursor, Windsurf, Claude Desktop)

**How to use:**
1. Copy this file to your project root as `.prompts/ai-wrapper.md`
2. Or copy the content to `.cursorrules`, `.windsurfrules`, etc.
3. Your AI will now automatically wrap all commands with `ai`

**Safe?** ✅ Yes - This is just a text prompt that guides the AI's behavior.

---

### `settings.local.json` (Optional - Advanced Users Only)
**Purpose:** Auto-approves `ai` commands in Claude Code so you don't get permission prompts.

**Compatible with:** Claude Code only (uses Claude Code's permission system).

**Do you need this?** Probably not if you're using MCP mode.

**How to use:**
1. Copy this file to your project root as `.prompts/settings.local.json`
2. Claude Code will automatically detect and use it
3. Commands matching the patterns will run without asking permission

**Safe?** ⚠️ **Use with caution** - This auto-approves ANY command run with `ai`, including potentially dangerous ones like `ai rm -rf /`.

**Recommendation:**
- Only use in **trusted projects** where you review what Claude Code is doing
- Consider **not using this** if you prefer manual approval for safety
- You can always approve commands individually without this file

---

## Quick Setup

### For MCP Mode Users (Recommended)
**You don't need any files from this folder!** Just configure the MCP server. See the main README.md.

### For CLI Mode Users

#### Option 1: Manual Copy (Safest)
```bash
# In your project root
mkdir -p .prompts
cp /path/to/ai-live-terminal-bridge/.prompts/ai-wrapper.md .prompts/
```

#### Option 2: Use Cursor/Windsurf Rules Files
```bash
# Copy the content from ai-wrapper.md to:
.cursorrules          # For Cursor (if not using MCP)
.windsurfrules        # For Windsurf (if not using MCP)
```

#### Option 3: Add Auto-Approval (Advanced)
```bash
# Only if you understand the security implications
cp /path/to/ai-live-terminal-bridge/.prompts/settings.local.json .prompts/
```

---

## Which Mode Should I Use?

### Use MCP Mode if:
- ✅ Your AI tool supports MCP (Claude Desktop, Claude Code, Cursor, Windsurf, etc.)
- ✅ You want zero configuration
- ✅ You want automatic guidance
- ✅ You want the best experience

### Use CLI Mode if:
- Your AI tool doesn't support MCP yet (Aider, Continue, etc.)
- You prefer manual configuration
- You're using an older AI tool

---

## Security Best Practices

1. **Always review what your AI is doing** - Even with prompts, monitor the commands being executed
2. **Start without auto-approval** - Try using just `ai-wrapper.md` first
3. **Add auto-approval only if needed** - Some users prefer the control of manual approval
4. **Use in trusted projects** - Don't blindly copy these files to untrusted repositories

---

## Troubleshooting

**Q: Do I need these files if I'm using Claude Code with MCP?**
- No! MCP mode provides automatic guidance. These files are optional.

**Q: My AI isn't using `ai` wrapper**
- If using MCP: Check that the MCP server is configured correctly
- If using CLI: Make sure the prompt file is in the correct location for your AI tool
- Check that the file is named correctly (`.cursorrules` for Cursor, etc.)
- Try restarting your AI tool after adding the file

**Q: Claude Code keeps asking for permission**
- This is normal and safe behavior
- You can approve individually, or add `settings.local.json` if you prefer
- Make sure `settings.local.json` is in `.prompts/` folder

**Q: Are these files included when I install the npm package?**
- No, you need to manually copy them from this repository
- They're project-specific configuration, not part of the global CLI tool
- Most users won't need them if using MCP mode
