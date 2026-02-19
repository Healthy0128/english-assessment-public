# English Reading Assessment Tool

This is a simple web application for assessing English reading pronunciation using the SpeechSuper API. Users can input English text, record their voice, and receive a detailed evaluation of their pronunciation, fluency, rhythm, and speed.

## Features

- **Text Input**: Enter any English text you want to practice.
- **Voice Recording**: Record your reading of the text directly in the browser.
- **Automatic Evaluation**: Get instant feedback on your pronunciation, including an overall score, fluency, rhythm, and speed.
- **Detailed JSON Output**: View detailed analysis results in JSON format.

## Getting Started

### Prerequisites

- Node.js and npm
- A SpeechSuper API account (https://www.speechsuper.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Healthy0128/english-reading-assessment-opensource.git
   cd english-reading-assessment-opensource
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your environment variables:**
   - Create a `.env` file in the root directory by copying the example file:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and add your SpeechSuper API credentials:
     ```
     SPEECHSUPER_APP_KEY="YOUR_APP_KEY_HERE"
     SPEECHSUPER_SECRET_KEY="YOUR_SECRET_KEY_HERE"
     SPEECHSUPER_API_URL="https://api.speechsuper.com/sent.eval.promax"
     ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. Open your browser and go to `http://localhost:3000`.

## How It Works

- The frontend captures audio using the browser's MediaRecorder API.
- The backend (Node.js/Express) receives the audio, converts it to WAV format using ffmpeg, and sends it to the SpeechSuper API.
- The evaluation results are returned to the frontend and displayed to the user.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Created for English language learners and educators who want a simple, self-hosted solution for pronunciation assessment.
