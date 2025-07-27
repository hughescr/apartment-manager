# SST Server Startup Guide

## Starting the Development Environment

### Correct Method
1. Run `bun run sst-dev` to start the SST development server
2. SST will automatically start Astro and other services
3. Navigate to the Web section in the SST console to see the Astro URL
4. The Astro URL will be shown in the SST console (typically http://localhost:4321/)

### Important Notes
- **DO NOT** run `bun run dev` directly - this will fail with SST link errors
- **DO NOT** run Astro separately - SST manages the Astro process
- If you need to restart Astro:
  1. In the SST console, navigate to the Web section
  2. Press `x` to kill the Astro process
  3. Press `Enter` to restart it

### Accessing URLs
- API URL: Available in the SST console output
- Upload API URL: Available in the SST console output  
- Astro Dev URL: Shown in the Web section of SST console

### Common Errors
- "SST links are not active" - This means Astro was started outside of SST
- "AWS credentials are not configured" - Use `op run --env-file=.env.op` prefix

### Debugging
- Use the SST console to view logs from all services
- Navigate between sections using arrow keys
- Press `Enter` to focus on a section
- Use `ctrl-z` to toggle sidebar
- Use `ctrl-u/d` to scroll within a section