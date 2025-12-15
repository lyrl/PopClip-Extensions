# Memos PopClip Extension

Save selected text directly to your Memos service with a single click.

## Features

- **Quick Save**: Select any text and click the Memos button to save it as a memo
- **Configurable**: Set your own Memos server URL and API token
- **Error Handling**: Clear feedback for successful saves or connection issues
- **Secure**: API token stored securely in PopClip preferences

## Setup

1. **Install the Extension**: Add this extension to your PopClip extensions folder
2. **Configure Settings**: Right-click the PopClip menu bar icon → Extensions → Memos → Options
3. **Set API URL**: Enter your Memos server URL (e.g., `http://localhost:5230`)
4. **Add API Token**: Enter your Memos API access token

### Getting Your Memos API Token

1. Open your Memos web interface
2. Go to Settings → API Tokens
3. Create a new access token
4. Copy the token and paste it into the PopClip extension settings

## Usage

1. **Select Text**: Highlight any text you want to save as a memo
2. **Click Memos**: Click the Memos button in the PopClip popup
3. **Confirmation**: You'll see a success message when the memo is saved

## Configuration

| Setting | Description | Example |
|---------|-------------|---------|
| Memos API URL | Your Memos server endpoint | `http://10.0.0.5:5230` |
| API Token | Your Memos access token | `eyJhbGciOiJIUzI1NiIsImtpZCI6...` |

## Troubleshooting

### Common Issues

**"Network error: Cannot reach Memos server"**
- Check that your Memos server is running
- Verify the API URL is correct
- Ensure network connectivity

**"API Error: 401 - Unauthorized"**
- Check that your API token is valid
- Regenerate token if necessary

**"API Error: 403 - Forbidden"**
- Verify your API token has write permissions
- Check Memos user permissions

### Testing

You can test the extension by:
1. Selecting some text
2. Using the PopClip action
3. Checking your Memos interface to confirm the memo was created

## Requirements

- PopClip 4688 or later
- Running Memos server with API access
- Network connectivity to your Memos server

## API Compatibility

This extension is compatible with:
- Memos v0.13.0 and later
- Standard Memos API v1 endpoints

## Privacy

- Your API token is stored locally in PopClip preferences
- Selected text is sent directly to your configured Memos server
- No data is sent to third-party services