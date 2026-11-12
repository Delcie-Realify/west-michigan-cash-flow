# Connecting the "Talk to Delcie" form (about 10 minutes)

The website's contact forms send each lead to **your Google Sheet** and **your email**, using a free Google Apps Script in your Google Workspace account. Until you finish these steps, the forms show a friendly "this form isn't connected yet" note and send nothing.

## 1. Make the Sheet
1. Go to [sheets.google.com](https://sheets.google.com) while signed in to your **Realify Google Workspace** account.
2. Click **Blank spreadsheet**. Name it something like **Realify Website Leads**.
   (You don't need to add columns — the script creates a **Leads** tab with headings the first time a lead arrives.)

## 2. Add the script
1. In that Sheet, click **Extensions → Apps Script**. A new tab opens.
2. Delete everything in the editor (the little `function myFunction() {}`).
3. Open `lead-form/Code.gs` from this website folder, copy **all** of it, and paste it into the editor.
4. Near the top, find:
   ```
   NOTIFY_EMAIL: 'YOUR-EMAIL-HERE',
   ```
   Replace `YOUR-EMAIL-HERE` with the address where you want lead emails (keep the quote marks).
5. Click the **Save** icon (💾). Name the project **Realify Lead Form** if asked.

## 3. (Optional) Test it
1. In the function drop-down at the top, choose **testSubmission**, then click **Run**.
2. Google will ask for permission. Click **Review permissions**, choose your account, then **Allow**.
   (If you see "Google hasn't verified this app", click **Advanced → Go to Realify Lead Form**. It's your own script.)
3. Check your Sheet (a new **Leads** tab with a "Test Person" row) and your inbox. Delete the test row afterward.

## 4. Publish it as a web app
1. Click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** Realify lead form
   - **Execute as:** **Me** (your account — so it can write to your Sheet and send your email)
   - **Who has access:** **Anyone** (so website visitors can send the form; they can't see your Sheet)
4. Click **Deploy** and approve permissions if asked.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy..../exec`.

## 5. Paste the URL into the website (one place)
1. Open **`assets/config.js`** in the website folder.
2. Find this line:
   ```
   LEAD_FORM_URL: "",
   ```
3. Paste your URL between the quotes:
   ```
   LEAD_FORM_URL: "https://script.google.com/macros/s/AKfy..../exec",
   ```
4. Save, then publish the website as usual. Send yourself a test from the site.

While you're in `assets/config.js`, also fill in the `[phone]`, `[email]`, license and address placeholders.

## Changing the script later
If you edit `Code.gs`, click **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. This keeps the **same URL**, so you don't need to touch the website. (Choosing "New deployment" instead creates a *new* URL you'd have to paste again.)

## Good to know
- **Limits:** a Workspace account can send about 1,500 emails a day through Apps Script — far more than a contact form needs.
- **Spam:** the form has a hidden "honeypot" box and a speed check; bots that trip them are silently ignored. If spam ever gets through, tell Claude and we can add Google reCAPTCHA.
- **Privacy:** leads go only to your Sheet and your inbox. Nothing is stored on the website.

## Technical note: why the form sends "plain text" (CORS)
The website is a static GitHub Pages site on a different address than Google's script, so browsers apply "CORS" rules. Apps Script can't answer the browser's pre-check ("preflight") that normal JSON requests trigger. To avoid it, the site sends the form as `Content-Type: text/plain` with JSON inside — a "simple" request that needs no pre-check — and the script reads it from `e.postData.contents`.

`assets/config.js` has a `LEAD_FORM_MODE` setting:

| Mode | How it works | Tradeoff |
|---|---|---|
| `"cors"` (default, recommended) | Normal request; Google's reply is readable. | Visitors see a real error if something is misconfigured (e.g., access not set to "Anyone"). Relies on Google continuing to allow cross-site reads of the reply, which it does today. |
| `"no-cors"` | Fire-and-forget; the browser hides Google's reply. | Always *looks* successful, even if the script is broken or the URL is wrong — so leads could be lost silently. Use only as a fallback. |

The script also accepts ordinary form fields (URL-encoded or a hidden `<iframe>` form post), so either approach works on the Google side.
