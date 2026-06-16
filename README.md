# BigQuery Release Notes Tracker & Social Sharer 📊🐦

A premium, modern dashboard web application built with Python Flask, Vanilla CSS, and Vanilla JavaScript. It fetches the live Google Cloud BigQuery release notes feed, parses/categorizes updates automatically, and provides an interactive composer to format, auto-shorten, and share updates on X (formerly Twitter).

---

## ✨ Features

- **🔄 Real-time Feed Fetching & Caching**: Pulls directly from the official Google Cloud BigQuery Atom feed. Implements server-side caching for fast loading speeds.
- **🎨 Glassmorphic Interface**: A sleek, dark developer-centric layout using CSS custom properties, backdrop filters, and subtle ambient moving glow elements.
- **🏷️ Automated Classification**: Automatically parses and badges release notes into semantic categories (*Features*, *Updates*, *Fixes*, *Deprecations*, and *Announcements*).
- **🔍 Quick Search & Filter**: Instantly search updates by keywords or filter by category tabs in real-time.
- **📝 Expandable Cards**: Read release note summaries at a glance, or expand cards to read full details with support for clean HTML formatting.
- **🐦 Interactive X/Twitter Composer**:
  - **Live Preview**: Simulates how a post will look on X.
  - **Circular Character Counter**: Displays character usage with a dynamic SVG progress ring (limits to 280 characters).
  - **Quick Helpers**: Includes buttons to auto-append relevant hashtags, auto-shorten descriptions to fit within the character limit while preserving the link, and restore the original text.
  - **Web Intent Integration**: Safely posts straight to X or copies to the clipboard.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11, Flask
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Modern CSS variables, Flexbox/Grid)
- **Icons**: FontAwesome 6

---

## 📂 Repository Structure

- `app.py`: Core Flask server, routing, feed fetching, and parsing logic.
- `templates/`: HTML structures.
- `static/style.css`: Design systems, animations, colors, and responsive styling.
- `static/script.js`: State management, filters, tweet composer logic, and interaction.
- `.gitignore`: Standard rules for Python and IDE environment files.

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Python installed. The project uses standard library modules (except for Flask).

### Step 1: Clone and Navigate
```bash
git clone https://github.com/Sreelakshmii-R/Book-Query-event-talks-app.git
cd Book-Query-event-talks-app
```

### Step 2: Install Flask
```bash
pip install flask
```

### Step 3: Run the Application
```bash
python app.py
```

### Step 4: Open in your Browser
Visit **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to view and use the app.

---

## 📄 License
This project is open-source. Feel free to modify, reuse, and extend!
