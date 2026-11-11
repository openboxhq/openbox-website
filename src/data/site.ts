const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** Google Apps Script web app that logs each form submission to a sheet and emails the team. */
export const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbzKH21kTTrJXwbVn548FsoiEeWwhzbo0jPOCMelvtEAGQ92JaMXzzR8RwRZk5uZU8IyhA/exec";

/** Every "Book a demo" and plan button opens the inbound form. */
export const DEMO_HREF = `${BASE}demo/`;

export const CONTACT_HREF = `${BASE}demo/?interest=company`;

export const DEMO_IS_EXTERNAL = false;
