# Courses page forms backend

Two forms on `courses.html` send submissions to one Google Apps Script web app:

- **Class inquiry** ("Get started"): saved to the `Inquiries` tab, as described
  below.
- **Language interest** ("Register interest"): one row per submission in the
  `Language interest` tab, with the languages chosen, what the person is
  interested in (classes, free resources, helping), and a note. It also
  emails the team and sends a confirmation.

For class inquiries, the script:

- adds **one row per child** to a Google Sheet, so you can sort by age and level
  when forming cohorts. Children from the same family share an **Inquiry ID**.
- emails the team (`NOTIFY_EMAIL`), with reply-to set to the parent
- emails the family a confirmation (turn off with `SEND_CONFIRMATION = false`)

The script (`inquiry-form.gs`) has no secrets in it. It is safe in a public repo.

## One-time setup (about 15 minutes)

Do this while signed in to the Speak Nigeria Google account that should own the data.

1. **Create the sheet.** In Google Sheets, create a blank spreadsheet named
   something like *Speak Nigeria – Class Inquiries*. You don't need to add
   headers; the script creates an `Inquiries` tab with headers on the first
   submission.
2. **Add the script.** In the sheet, open **Extensions → Apps Script**. Delete
   the placeholder code in `Code.gs`, paste in all of `inquiry-form.gs`, and
   click **Save**. Change `NOTIFY_EMAIL` at the top if needed.
3. **Deploy as a web app.** Click **Deploy → New deployment**. Next to "Select
   type", click the gear icon and choose **Web app**. Then set:
   - Description: `Inquiry form`
   - Execute as: **Me**
   - Who has access: **Anyone**. The website's visitors aren't signed in to
     Google, so this is required. It only allows them to submit the form. It
     does not give access to the sheet.
4. **Authorize.** Click **Deploy** and approve the permissions (Sheets and
   sending email). Google will warn that the app isn't verified, because it's
   your own script. Click **Advanced → Go to … (unsafe)** to continue.
5. **Copy the web app URL.** It ends in `/exec`. Paste it into `courses.html`
   in the form's `data-endpoint` attribute:
   ```html
   <form class="inquiry-form" data-endpoint="https://script.google.com/macros/s/…/exec" novalidate>
   ```
6. **Test.** Submit the form on the site. You should see a new row in the
   sheet, a notification email, and a confirmation email.

## Changing the script later

After editing the script, go to **Deploy → Manage deployments**, click the
pencil icon on the existing deployment, set **Version: New version**, and
click **Deploy**. This keeps the same `/exec` URL. Choosing **New
deployment** instead creates a different URL, and the website would keep
using the old one.

## Working the sheet

- The **Status** column starts as `New`. Update it as you go, e.g.
  Contacted, Placed, Member.
- Use **Data → Create a filter** to sort by Age or Yoruba level when grouping
  cohorts.
- Consider protecting the header row so it doesn't get edited by accident. The
  script appends rows in column order.

## Limits and spam

- Each inquiry sends two emails. Apps Script can send to 1,500 recipients a
  day from a Google Workspace account, including Workspace for Nonprofits.
  That's about 750 inquiries a day. A personal @gmail.com account gets only
  100 a day, so **create the sheet and deploy the script while signed in to
  your speaknigeria.org account.**
- If the email quota ever runs out, submissions are still saved to the sheet.
  Only that day's emails are skipped.
- Spam protection: a hidden "website" field that only bots fill in, plus a
  3-second minimum fill time. Flagged submissions are quietly dropped. If
  spam gets through anyway, add Cloudflare Turnstile.

## Local preview

If `data-endpoint` is empty, the form still works on `localhost`. It shows the
thank-you screen and logs the submission to the browser console without
sending anything. On the live site, an empty endpoint shows an error with the
email address.
