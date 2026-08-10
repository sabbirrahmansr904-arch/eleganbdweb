# Finance & Settlement Dashboard

এই ZIP-এ একটি standalone, responsive Finance Dashboard দেওয়া হয়েছে।

## Run
`index.html` ব্রাউজারে খুললেই চলবে। কোনো build step দরকার নেই।

## Features
- 3 account balance cards
- Dynamic income / expense / deposit / withdrawal / transfer entry
- Account creation/edit
- Search/filter
- Transaction edit/delete
- Automatic balance calculation
- Summary statistics
- Account balance donut chart
- Recent activity
- CSV report export
- localStorage persistence
- Responsive desktop/tablet/mobile UI

## AI Studio / Existing Project Integration
`index.html`, `styles.css`, `app.js` আলাদা ফাইল হিসেবে আপনার existing project-এ কপি করুন।
Existing sidebar/header থাকলে `index.html`-এর main Finance content এবং `styles.css`/`app.js` থেকে প্রয়োজনীয় অংশ integrate করুন।

নোট: এটি frontend/localStorage implementation। Production multi-user database-এর জন্য আপনার existing backend/API/database-এর সাথে CRUD endpoint connect করতে হবে।
