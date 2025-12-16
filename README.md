<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1lZsOv68S9iBfvVRmfrkg9vdcvcNii13J

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env` and set the following environment variables:
   - `VITE_API_KEY`: Gemini API key
   - `VITE_KAKAO_REST_API_KEY`: Kakao REST API key for address lookup
   - `VITE_KAKAO_JAVASCRIPT_KEY`: Kakao Maps JavaScript key for the embedded maps
3. Run the app:
   `npm run dev`

### Local Roles

- **Gym Owners**: Sign up with the owner role to publish gyms (location, photos, amenities, equipment, operating hours). Listings are stored in browser storage so you can return and edit later.
- **Members**: Sign up with the member role to generate AI fitness plans, browse owner-published gyms on the map, and reserve individual pieces of equipment.
