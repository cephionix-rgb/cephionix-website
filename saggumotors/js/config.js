/*
  Saggu Motor Garage - site settings
  Edit this file to change the booking rules, services and contact details.
  The website AND the booking server both read it, so there is one source of truth.
*/
window.SAGGU_CONFIG = {
  name: "Saggu Motor Garage",
  city: "Sardulgarh",
  since: 1997,

  // Contact details. Anything left empty is simply not shown on the site.
  phone: "",          // e.g. "+91 98765 43210"
  whatsapp: "",       // digits only with country code, e.g. "919876543210"
  address: "",        // street address for the footer
  hours: "",          // e.g. "Mon to Sat, 9 am to 6 pm"
  mapsQuery: "Saggu Motor Garage Sardulgarh",
  instagram: "https://www.instagram.com/saggu_motar_garage/",
  instagramHandle: "@saggu_motar_garage",

  // The garage has two branches. Each branch has its own bays and its own bookings.
  // Add each branch's full address and phone below (anything left empty is hidden).
  branches: [
    { id: "sardulgarh", name: "Sardulgarh", city: "Punjab", address: "", phone: "", mapsQuery: "Saggu Motor Garage Sardulgarh" },
    { id: "mohali", name: "Mohali", city: "Punjab", address: "", phone: "", mapsQuery: "Saggu Motor Garage Mohali" }
  ],

  booking: {
    // Each branch takes at most five cars a day: one per bay. Each bay has a drop-off time.
    bays: [
      { n: 1, time: "09:00" },
      { n: 2, time: "10:30" },
      { n: 3, time: "12:00" },
      { n: 4, time: "14:00" },
      { n: 5, time: "15:30" }
    ],
    closedWeekdays: [0],   // 0 = Sunday ... 6 = Saturday. Change if you work on Sundays.
    advanceDays: 30,       // how far ahead customers can book
    timezone: "Asia/Kolkata"
  },

  services: [
    { id: "engine",     title: "Engine and tune-up",      text: "Diagnosis, oil and filter changes, spark plugs, belts and timing checks." },
    { id: "brakes",     title: "Brakes",                  text: "Pads, discs, brake fluid and brake-line checks." },
    { id: "suspension", title: "Suspension and steering", text: "Shock absorbers, bushes, joints and wheel alignment." },
    { id: "wheels",     title: "Wheels and tyres",        text: "Balancing, rotation and puncture repair." },
    { id: "ac",         title: "Air-conditioning",        text: "Gas top-up, leak checks and filter cleaning." },
    { id: "electrical", title: "Electrical and battery",  text: "Battery tests, alternators, starters and lights." },
    { id: "inspection", title: "Full inspection",         text: "A complete check before a long trip or before you buy a used car." }
  ]
};
