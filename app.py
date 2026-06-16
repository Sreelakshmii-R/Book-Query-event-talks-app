from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import html
import re
import traceback

app = Flask(__name__)

# Global cache for release notes
cached_releases = []

def parse_feed(xml_data):
    """
    Parses the Atom feed XML and returns a list of dictionaries representing release notes.
    """
    root = ET.fromstring(xml_data)
    
    # Extract namespace if present
    m = re.match(r'\{([^}]+)\}', root.tag)
    if m:
        ns = {'ns': m.group(1)}
        prefix = 'ns:'
    else:
        ns = {}
        prefix = ''
        
    entries = []
    for entry in root.findall(f'{prefix}entry', ns):
        title_elem = entry.find(f'{prefix}title', ns)
        title_text = title_elem.text if title_elem is not None else "Untitled Update"
        
        updated_elem = entry.find(f'{prefix}updated', ns)
        updated_text = updated_elem.text if updated_elem is not None else ""
        
        published_elem = entry.find(f'{prefix}published', ns)
        published_text = published_elem.text if published_elem is not None else updated_text
        
        id_elem = entry.find(f'{prefix}id', ns)
        id_text = id_elem.text if id_elem is not None else ""
        
        content_elem = entry.find(f'{prefix}content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse links if any
        link_elem = entry.find(f'{prefix}link', ns)
        link_url = ""
        if link_elem is not None:
            link_url = link_elem.attrib.get('href', '')
            
        # Fallback link to BigQuery release notes documentation if none found
        if not link_url:
            link_url = "https://cloud.google.com/bigquery/docs/release-notes"
            
        # Clean HTML tags to get clean plain text for summary / tweeting
        # Remove tags, but handle line breaks nicely
        clean_content = content_html
        # Replace <br> and </p> with newlines to preserve spacing
        clean_content = re.sub(r'<br\s*/?>|</p>', '\n', clean_content)
        clean_text = re.sub(r'<[^<]+?>', '', clean_content)
        clean_text = html.unescape(clean_text).strip()
        # Clean up excessive newlines/spaces
        clean_text = re.sub(r'\n\s*\n', '\n', clean_text)
        clean_text = re.sub(r' +', ' ', clean_text)
        
        # Categorize the update based on title and content keywords
        category = "Update"
        title_lower = title_text.lower()
        content_lower = clean_text.lower()
        
        # Google BigQuery release notes titles often look like "March 15, 2026"
        # The content usually contains the actual notes, starting with bold headings like "Feature" or "Change" or "Fix"
        if "feature" in title_lower or "feature" in content_lower or "new" in content_lower:
            category = "Feature"
        elif "fix" in title_lower or "resolved" in title_lower or "bug" in content_lower:
            category = "Fix"
        elif "deprecat" in title_lower or "deprecat" in content_lower or "removed" in content_lower:
            category = "Deprecation"
        elif "announc" in title_lower or "announc" in content_lower:
            category = "Announcement"
            
        entries.append({
            'id': id_text,
            'title': title_text,
            'published': published_text,
            'updated': updated_text,
            'content': content_html,
            'summary': clean_text,
            'link': link_url,
            'category': category
        })
        
    return entries

def fetch_feed_data():
    """
    Fetches XML from Google Cloud release notes feed and parses it.
    """
    global cached_releases
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    parsed_entries = parse_feed(xml_data)
    cached_releases = parsed_entries
    return parsed_entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    global cached_releases
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        if force_refresh or not cached_releases:
            fetch_feed_data()
        return jsonify({
            'status': 'success',
            'count': len(cached_releases),
            'releases': cached_releases
        })
    except Exception as e:
        print("Error fetching release notes:")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Try to load initial data at startup (gracefully ignore if it fails)
    try:
        fetch_feed_data()
        print(f"Successfully loaded {len(cached_releases)} release notes.")
    except Exception as e:
        print("Initial feed load failed. Will retry on request.", e)
        
    app.run(host='127.0.0.1', port=5000, debug=True)
