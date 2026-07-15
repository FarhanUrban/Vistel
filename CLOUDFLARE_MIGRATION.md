# Cloudflare Pages Migration Guide

This guide explains how to set up and host the Vislet application on Cloudflare Pages.

We have already configured:
1. **Single Page Application (SPA) routing:** via the `public/_redirects` file, ensuring all URLs correctly fallback to `index.html`.
2. **Response headers (COOP and Cache-Control):** via the `public/_headers` file, ensuring custom headers from `firebase.json` are preserved.
3. **Deployment script:** added `"pages:deploy": "npm run build && wrangler pages deploy dist"` to `package.json`.

---

## Method 1: Git Integration (Recommended)

Connecting your GitHub repository to Cloudflare Pages is the best method. Cloudflare will automatically build and deploy your site every time you push to your default branch (`main` or `master`), and it will create staging previews for Pull Requests.

### Step-by-Step Setup:
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left sidebar, click **Workers & Pages**.
3. Click the **Create application** button, then select the **Pages** tab.
4. Click **Connect to Git**.
5. Connect your GitHub or GitLab account and select your repository (`vislet`).
6. Set up the Build settings:
   - **Project name:** `vislet` (or your preferred name)
   - **Production branch:** `main` (or your main branch)
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
7. (Optional) If you have environment variables, expand the **Environment variables** section and add the production variables from your `.env.production`.
8. Click **Save and Deploy**.

Cloudflare will clone your repository, build the project, and host it on a `*.pages.dev` subdomain.

---

## Method 2: Command Line (CLI) Deployment

If you prefer to deploy manually from your terminal (or from your own CI/CD runner), you can use the Wrangler CLI.

### Step-by-Step Setup:
1. **Log in to Cloudflare on your machine:**
   Run the following command in your terminal and follow the browser prompts to authenticate:
   ```bash
   npx wrangler login
   ```
2. **Deploy the application:**
   Run the deployment script we added to your `package.json`:
   ```bash
   npm run pages:deploy
   ```
3. During the first run, Wrangler will ask you:
   - *Would you like to create a new project?* Select **Yes**.
   - *Enter the name of your project:* Enter `vislet` (or your preferred project name).
   - *Enter the production branch name:* Enter `main`.

Wrangler will build the project and upload the files directly from your local `dist/` directory.

---

## Setting up a Custom Domain

Once your site is deployed (using either Git or CLI), you can connect your custom domain:
1. Go to your Pages project in the Cloudflare Dashboard.
2. Select the **Custom domains** tab.
3. Click **Set up a custom domain**.
4. Enter your domain (e.g., `example.com` or `app.example.com`).
5. Follow the prompts:
   - If your domain's DNS is managed by Cloudflare, it will configure the DNS record automatically in 1-click.
   - If managed elsewhere, Cloudflare will provide a CNAME record that you must add to your domain registrar's DNS settings.

---

## Firebase Services Clean Up (Optional)

Since we are only migrating the **Hosting** service, your Firebase database (Firestore/Dataconnect) and Storage will continue to work perfectly. 

To disable the old Firebase Hosting to avoid split traffic:
1. Run `firebase hosting:disable` in your command line, or
2. Go to the Firebase Console -> Hosting, select the site, and disable or delete the hosting history.
