/* ============================================================
   NexaFlow AI — AI Delivery Studio engine  (ES5, no dependencies)
   ============================================================
   "When a client books, the AI performs the task."

   Given a booked client's details, this engine GENERATES the full
   delivery package:
     1. A complete, ready-to-publish website (single HTML file)
     2. The AI assistant training script (welcome + Q&A + WhatsApp)
     3. The client onboarding message (WhatsApp + email)
     4. A 7-day delivery plan + SEO meta

   It is 100% offline/deterministic so it always works (in the
   preview, on any host, any browser). Optional: paste a free
   OpenRouter key in CONFIG to let a real LLM polish the copy —
   the engine is always the fallback.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    aiKey: '',        // optional OpenRouter key (https://openrouter.ai/keys)
    aiModel: 'meta-llama/llama-3.1-8b-instruct:free',
    aiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    fallbackPhone: '0545886354',
    fallbackCity: 'Accra, Ghana',
    brand: 'NexaFlow AI'
  };

  /* ------------------------------------------------------------
     Knowledge base — tailored copy per business type.
     ------------------------------------------------------------ */
  var KB = {};

  KB.salon = {
    label: 'Salon & Beauty',
    tagline: 'Look your best, every day',
    heroHead: '{business} — Beauty & Style in {city}',
    heroSub: 'Premium hair, nails, and skincare in a relaxing space. Book your appointment online in seconds — walk out feeling brand new.',
    about1: '{business} is a professional beauty studio in {city}, known for quality service, clean tools, and styles that turn heads. Our team listens first, then creates a look that fits your face, your lifestyle, and your budget.',
    about2: 'From braids and wigs to nails, facials, and makeup, we use trusted products and honest pricing — no surprises at checkout. Whether it\u2019s a quick touch-up or a full makeover, you\u2019ll leave confident.',
    services: [
      { n: 'Hair styling', d: 'Braids, wigs, weaves, relaxers, and treatments — done by experienced stylists.' },
      { n: 'Nails & spa', d: 'Manicures, pedicures, and nail art with hygienic, single-use tools.' },
      { n: 'Makeup', d: 'Bridal, photoshoot, and everyday makeup that lasts all day.' },
      { n: 'Skin & facials', d: 'Deep-cleansing facials and treatments for every skin type.' }
    ],
    why: ['Experienced, friendly stylists', 'Strict hygiene & clean tools', 'Online booking — no waiting in line'],
    faq: [
      { q: 'Do I need an appointment?', a: 'Walk-ins are welcome, but we recommend booking online to skip the wait and guarantee your slot.' },
      { q: 'Do you do bridal packages?', a: 'Yes — we offer bridal hair and makeup packages with a trial session. Message us for a quote.' },
      { q: 'What products do you use?', a: 'We use trusted professional brands and can use your own products on request.' },
      { q: 'Can I change my booking?', a: 'Yes, you can reschedule through WhatsApp at no charge up to 24 hours before your slot.' }
    ],
    hours: 'We\u2019re open Monday to Saturday, 8am \u2013 8pm. Sundays by appointment only.',
    booking: 'You can book instantly on this website \u2014 choose your service, pick a time, and we\u2019ll confirm on WhatsApp.',
    payment: 'We accept cash, mobile money (MTN & Telecel), and card payments. A small deposit may be required for large bookings.',
    welcome: 'Hi! \u2728 Welcome to {business}. How can we make you look great today? Ask me about services, prices, or book an appointment.',
    waReply: 'Thanks for messaging {business}! \u2728 We\u2019ll reply within a few minutes. Meanwhile, tell us which service you\u2019d like and your preferred day/time.',
    keywords: 'salon, hair, braids, nails, makeup, beauty, {city}'
  };

  KB.restaurant = {
    label: 'Restaurant / Food',
    tagline: 'Food worth coming back for',
    heroHead: '{business} — Fresh Food, Made with Love in {city}',
    heroSub: 'Delicious meals, fast service, and honest prices. Order online, book a table, or get it delivered to your door.',
    about1: '{business} serves fresh, flavourful food in {city} — from local favourites to crowd-pleasing classics. Every dish is prepared to order with quality ingredients and generous portions.',
    about2: 'Whether you\u2019re dining in, ordering takeaway, or planning an event, our team makes it easy. Browse the menu, order in seconds, and enjoy.',
    services: [
      { n: 'Dine-in', d: 'A clean, welcoming space for family meals, dates, and group gatherings.' },
      { n: 'Takeaway & delivery', d: 'Order online and pick it up or get it delivered fast.' },
      { n: 'Catering & events', d: 'Buffets and packages for parties, meetings, and celebrations.' },
      { n: 'Specials & combos', d: 'Daily specials and value combos that keep customers coming back.' }
    ],
    why: ['Fresh ingredients, made to order', 'Fast service — even at rush hour', 'Online ordering & delivery'],
    faq: [
      { q: 'Do you deliver?', a: 'Yes — we deliver within {city}. Delivery time is usually 30\u201345 minutes depending on your location.' },
      { q: 'Do you have vegetarian options?', a: 'Yes, we have several vegetarian and healthy options on the menu.' },
      { q: 'Can I book a table?', a: 'Yes, book a table right here on the website or message us on WhatsApp.' },
      { q: 'Do you cater for events?', a: 'Absolutely — we cater weddings, birthdays, and corporate events. Message us for a package.' }
    ],
    hours: 'We\u2019re open every day from 9am \u2013 10pm.',
    booking: 'You can order or reserve a table on this website \u2014 it takes less than a minute.',
    payment: 'We accept cash, mobile money, and cards. Pay online or on delivery.',
    welcome: 'Hi! \ud83c\udf7d Welcome to {business}. Craving something? Ask me about the menu, today\u2019s specials, or place an order.',
    waReply: 'Thanks for contacting {business}! \ud83c\udf7d Let us know what you\u2019d like to order and your location \u2014 we\u2019ll confirm right away.',
    keywords: 'restaurant, food, delivery, catering, {city}'
  };

  KB.gym = {
    label: 'Gym & Fitness',
    tagline: 'Stronger every session',
    heroHead: '{business} — Get Fit in {city}',
    heroSub: 'Modern equipment, expert coaches, and a community that keeps you accountable. Start your transformation today.',
    about1: '{business} is more than a gym — it\u2019s a community in {city} where beginners and athletes train side by side. Our coaches build a plan around your goals, and our members keep you motivated.',
    about2: 'From strength training and cardio to group classes and personal coaching, we make fitness simple, safe, and effective.',
    services: [
      { n: 'Gym membership', d: 'Full access to modern equipment, showers, and changing rooms.' },
      { n: 'Personal training', d: '1-on-1 coaching with a custom plan and monthly check-ins.' },
      { n: 'Group classes', d: 'High-energy classes — cardio, strength, and functional training.' },
      { n: 'Fitness plans', d: 'Nutrition and workout plans you can follow at home or in the gym.' }
    ],
    why: ['Qualified, certified coaches', 'Clean, modern equipment', 'Flexible plans for every level'],
    faq: [
      { q: 'Do you offer a free trial?', a: 'Yes — come try your first session free. Message us to claim it.' },
      { q: 'Do I need experience?', a: 'Not at all. Our coaches will guide you from day one, whatever your level.' },
      { q: 'What are your opening hours?', a: 'We\u2019re open early mornings to late evenings, 7 days a week.' },
      { q: 'How much is membership?', a: 'Plans are flexible and affordable — message us for current prices and offers.' }
    ],
    hours: 'We\u2019re open Monday to Friday 5am \u2013 9pm, Saturday 7am \u2013 7pm, Sunday 8am \u2013 4pm.',
    booking: 'Book a free trial or sign up right here on the website — we\u2019ll confirm your start date.',
    payment: 'We accept cash, mobile money, and cards. Monthly and quarterly plans available.',
    welcome: 'Hi! \ud83d\udcaa Welcome to {business}. Ready to start? Ask me about membership, classes, or book a free trial.',
    waReply: 'Thanks for reaching out to {business}! \ud83d\udcaa Tell us your fitness goal and we\u2019ll recommend the right plan.',
    keywords: 'gym, fitness, personal training, classes, {city}'
  };

  KB.clinic = {
    label: 'Clinic / Healthcare',
    tagline: 'Care you can trust',
    heroHead: '{business} — Quality Healthcare in {city}',
    heroSub: 'Experienced professionals, modern facilities, and appointments that respect your time. Your health comes first.',
    about1: '{business} provides reliable, affordable healthcare in {city}. Our qualified team takes time to listen, explain clearly, and give you a treatment plan you understand.',
    about2: 'From consultations and lab tests to follow-up care, we make getting healthy simple — with easy online booking and reminders.',
    services: [
      { n: 'Consultations', d: 'General and specialist consultations with experienced professionals.' },
      { n: 'Lab & diagnostics', d: 'On-site tests and screenings with fast, accurate results.' },
      { n: 'Preventive care', d: 'Check-ups, vaccinations, and wellness plans for the whole family.' },
      { n: 'Follow-up care', d: 'Reminders and check-ins to make sure your recovery stays on track.' }
    ],
    why: ['Qualified, caring professionals', 'Clean, modern facility', 'Online booking & reminders'],
    faq: [
      { q: 'Do I need to book an appointment?', a: 'We recommend booking online to avoid waiting, but walk-ins are accepted for urgent needs.' },
      { q: 'Do you accept insurance?', a: 'We accept most major insurance plans — message us with your provider to confirm.' },
      { q: 'What are your hours?', a: 'We\u2019re open Monday to Saturday. Emergency contact is available after hours.' },
      { q: 'How do I get my results?', a: 'Results are sent to you securely via WhatsApp or phone call, usually within 24\u201348 hours.' }
    ],
    hours: 'We\u2019re open Monday to Friday 8am \u2013 6pm and Saturday 9am \u2013 2pm.',
    booking: 'Book your appointment online in under a minute — we\u2019ll send you a confirmation and reminder.',
    payment: 'We accept cash, mobile money, and cards. Insurance is accepted where applicable.',
    welcome: 'Hi! \ud83e\ude7a Welcome to {business}. How can we help? Ask about services, hours, or book an appointment.',
    waReply: 'Thank you for contacting {business}. \ud83e\ude7a Please describe your concern and a team member will respond shortly.',
    keywords: 'clinic, healthcare, doctor, consultation, lab, {city}'
  };

  KB.realestate = {
    label: 'Real Estate / Property',
    tagline: 'Your property, our priority',
    heroHead: '{business} — Find Your Perfect Property in {city}',
    heroSub: 'Buy, rent, or sell with confidence. Verified listings, honest advice, and a team that handles everything.',
    about1: '{business} helps clients buy, sell, and rent property across {city} with transparency and speed. We verify every listing, negotiate hard for you, and manage the paperwork end-to-end.',
    about2: 'Looking for a home, an office, or an investment? Tell us what you need and we\u2019ll shortlist the best options in days, not months.',
    services: [
      { n: 'Property sales', d: 'Buy or sell homes, land, and commercial property with full support.' },
      { n: 'Rentals & leasing', d: 'Verified rental listings and lease management.' },
      { n: 'Property management', d: 'We handle tenants, rent collection, and maintenance.' },
      { n: 'Investment advisory', d: 'Data-backed advice on where and what to buy.' }
    ],
    why: ['Verified, fraud-free listings', 'Honest market pricing', 'End-to-end paperwork support'],
    faq: [
      { q: 'Are your listings verified?', a: 'Yes — every listing is physically verified and documented before it goes live.' },
      { q: 'Do you help with paperwork?', a: 'Yes, we handle agreements, due diligence, and registration from start to finish.' },
      { q: 'Can I sell through you?', a: 'Absolutely — we market your property, screen buyers, and negotiate the best price.' },
      { q: 'How fast can I find a place?', a: 'Most clients get a shortlist of matched properties within 3\u20137 days.' }
    ],
    hours: 'We\u2019re available Monday to Saturday, 9am \u2013 6pm, with viewing appointments on request.',
    booking: 'Book a free consultation or a viewing right here — tell us your budget and area, we\u2019ll handle the rest.',
    payment: 'Fees are transparent and agreed upfront. We accept bank transfer, mobile money, and card.',
    welcome: 'Hi! \ud83c\udfe1 Welcome to {business}. Looking to buy, rent, or sell? Tell me your budget and preferred area.',
    waReply: 'Thanks for contacting {business}! \ud83c\udfe1 Tell us what you\u2019re looking for (buy/rent, budget, area) and we\u2019ll shortlist options for you.',
    keywords: 'real estate, property, buy, rent, land, {city}'
  };

  KB.fashion = {
    label: 'Fashion / Boutique',
    tagline: 'Style that speaks for you',
    heroHead: '{business} — Fashion that Fits Your Style in {city}',
    heroSub: 'Trendy, quality clothing and accessories at prices you\u2019ll love. Shop online and get it delivered to your door.',
    about1: '{business} is a boutique in {city} curating on-trend, quality fashion for men and women. We hand-pick every piece so you always find something that fits your style and budget.',
    about2: 'Order online with fast delivery, or visit us in store. New arrivals drop every week — follow us on WhatsApp to see them first.',
    services: [
      { n: 'Clothing', d: 'Dresses, shirts, trousers, and more — curated for every occasion.' },
      { n: 'Accessories', d: 'Bags, shoes, and jewellery to complete the look.' },
      { n: 'Online orders & delivery', d: 'Shop on this site or WhatsApp and get same-day delivery in {city}.' },
      { n: 'Styling advice', d: 'Not sure what fits you? Message us — we\u2019ll help you choose.' }
    ],
    why: ['Quality you can feel', 'New arrivals every week', 'Fast delivery & easy returns'],
    faq: [
      { q: 'Do you deliver?', a: 'Yes — we deliver across {city}, often the same day for orders placed before 2pm.' },
      { q: 'Can I return an item?', a: 'Yes, unworn items can be exchanged within 7 days with the receipt.' },
      { q: 'Do you have plus sizes?', a: 'Yes, many styles come in a full size range — message us for availability.' },
      { q: 'How do I pay?', a: 'Cash on delivery, mobile money, or card — online or at the store.' }
    ],
    hours: 'We\u2019re open Monday to Saturday, 9am \u2013 8pm. Online orders accepted 24/7.',
    booking: 'Order directly on this website or via WhatsApp — we\u2019ll confirm and arrange delivery.',
    payment: 'We accept cash on delivery, mobile money (MTN & Telecel), and card payments.',
    welcome: 'Hi! \ud83d\udc57 Welcome to {business}. Looking for something specific? Ask about styles, sizes, or delivery.',
    waReply: 'Thanks for messaging {business}! \ud83d\udc57 Send us a photo or describe what you want — we\u2019ll reply with options and prices.',
    keywords: 'fashion, boutique, clothing, style, {city}'
  };

  KB.school = {
    label: 'School / Education',
    tagline: 'Learning that lasts a lifetime',
    heroHead: '{business} — Shaping Bright Futures in {city}',
    heroSub: 'Quality education, caring teachers, and a safe environment where every child is known and supported.',
    about1: '{business} provides quality education in {city}, combining strong academics with character, creativity, and confidence. Our teachers know every student by name and support them individually.',
    about2: 'We welcome families to visit, meet our teachers, and see the difference. Admissions are open — book a tour today.',
    services: [
      { n: 'Day school', d: 'Nursery, primary, and junior high with a rich curriculum.' },
      { n: 'After-school programmes', d: 'Clubs, sports, and extra tuition to develop every child.' },
      { n: 'Admissions support', d: 'Simple application and enrolment, guided step by step.' },
      { n: 'School events', d: 'Open days, sports days, and parent-teacher meetings.' }
    ],
    why: ['Experienced, dedicated teachers', 'Safe & supportive environment', 'Strong academic results'],
    faq: [
      { q: 'How do I apply?', a: 'Book a school tour or request an application form here on the website.' },
      { q: 'What ages do you accept?', a: 'We accept children from nursery through junior high — message us for the full age range.' },
      { q: 'What are the school fees?', a: 'Fees depend on the level — message us for the current fee structure and payment plans.' },
      { q: 'Do you offer transport?', a: 'Yes, we provide safe bus transport on selected routes across {city}.' }
    ],
    hours: 'School hours are 7:30am \u2013 3:30pm, Monday to Friday. The office is open until 5pm.',
    booking: 'Book a school tour or request an application form right here — we\u2019ll call you back.',
    payment: 'We accept bank transfer, mobile money, and card. Termly or flexible payment plans available.',
    welcome: 'Hi! \ud83c\udf93 Welcome to {business}. Ask me about admissions, fees, or book a school tour.',
    waReply: 'Thank you for contacting {business}! \ud83c\udf93 Let us know your child\u2019s age and level, and we\u2019ll guide you through admissions.',
    keywords: 'school, education, admissions, {city}'
  };

  KB.hotel = {
    label: 'Hotel / Guesthouse',
    tagline: 'Rest, recharge, return',
    heroHead: '{business} — Comfort & Hospitality in {city}',
    heroSub: 'Clean rooms, warm service, and great value. Book your stay in seconds — business or leisure, we\u2019ve got you.',
    about1: '{business} offers comfortable, spotless rooms in the heart of {city}. Whether you\u2019re travelling for business or a weekend away, our team makes every stay easy and relaxing.',
    about2: 'Enjoy free Wi-Fi, breakfast options, secure parking, and 24-hour front desk service. Book directly on this site for the best rates.',
    services: [
      { n: 'Room booking', d: 'Single, double, and family rooms — book instantly online.' },
      { n: 'Dining & breakfast', d: 'Fresh breakfast and room service available daily.' },
      { n: 'Events & meetings', d: 'Conference and function rooms for your gatherings.' },
      { n: 'Airport pickup', d: 'We arrange reliable transport to and from the airport.' }
    ],
    why: ['Clean, comfortable rooms', '24-hour front desk', 'Best rates when you book direct'],
    faq: [
      { q: 'What time is check-in?', a: 'Check-in is from 2pm and check-out by 11am. Early/late requests can usually be arranged.' },
      { q: 'Is breakfast included?', a: 'Some rates include breakfast — check the rate when booking or ask us.' },
      { q: 'Do you have parking?', a: 'Yes, we have free, secure parking for guests.' },
      { q: 'Do you offer airport pickup?', a: 'Yes — request it when booking and we\u2019ll arrange your pickup.' }
    ],
    hours: 'Our front desk is open 24 hours a day, 7 days a week.',
    booking: 'Book your room directly on this website for the best rate — instant confirmation.',
    payment: 'We accept card, mobile money, bank transfer, and cash. Pay online or at check-in.',
    welcome: 'Hi! \ud83c\udfe8 Welcome to {business}. Looking for a room? Ask about availability, rates, or book your stay.',
    waReply: 'Thanks for contacting {business}! \ud83c\udfe8 Tell us your dates and number of guests, and we\u2019ll confirm availability and rates.',
    keywords: 'hotel, guesthouse, rooms, booking, {city}'
  };

  KB.auto = {
    label: 'Auto / Repairs',
    tagline: 'Your car, in safe hands',
    heroHead: '{business} — Trusted Auto Care in {city}',
    heroSub: 'Honest diagnosis, quality parts, and fair prices. Book a service and get your car back on the road fast.',
    about1: '{business} is a trusted auto workshop in {city}, known for honest advice and quality workmanship. From routine servicing to major repairs, we tell you exactly what your car needs — and what it doesn\u2019t.',
    about2: 'Book online, drop off your car, and we\u2019ll keep you updated by WhatsApp. No jargon, no surprise bills.',
    services: [
      { n: 'Routine servicing', d: 'Oil changes, filters, and full safety checks.' },
      { n: 'Diagnostics & repairs', d: 'Computer diagnostics and mechanical repairs, big or small.' },
      { n: 'Tyres & brakes', d: 'Tyre fitting, alignment, and brake service.' },
      { n: 'AC & electrical', d: 'Air-conditioning service and auto-electrical work.' }
    ],
    why: ['Honest diagnosis & fair quotes', 'Quality parts with warranty', 'WhatsApp updates while we work'],
    faq: [
      { q: 'Do I need an appointment?', a: 'Booking online guarantees your slot — walk-ins are accepted when space allows.' },
      { q: 'How long does a service take?', a: 'A routine service is usually same-day; bigger jobs depend on parts availability.' },
      { q: 'Do you use original parts?', a: 'We offer both original and quality aftermarket parts — you choose, we advise.' },
      { q: 'Do you offer a warranty?', a: 'Yes, workmanship and parts are covered by warranty.' }
    ],
    hours: 'We\u2019re open Monday to Saturday, 8am \u2013 6pm.',
    booking: 'Book your service online in under a minute — tell us the car and the issue.',
    payment: 'We accept cash, mobile money, and card. Quotes are given before any work starts.',
    welcome: 'Hi! \ud83d\ude97 Welcome to {business}. Describe the issue or ask about a service — we\u2019ll help and quote you.',
    waReply: 'Thanks for contacting {business}! \ud83d\ude97 Tell us your car model and the problem, and we\u2019ll give you a quick answer.',
    keywords: 'auto, car repair, service, tyres, {city}'
  };

  KB.other = {
    label: 'Other business',
    tagline: 'Great service, every time',
    heroHead: '{business} — Trusted in {city}',
    heroSub: 'Professional service, fair prices, and easy online booking. We make it simple to work with us.',
    about1: '{business} is a professional service provider in {city}, committed to quality, honesty, and making every customer happy. We respond fast and deliver on our promises.',
    about2: 'Ask us anything — our AI assistant answers instantly, and our team is one message away on WhatsApp.',
    services: [
      { n: 'Our services', d: 'Tell us what you need and we\u2019ll handle it professionally.' },
      { n: 'Consultation', d: 'Free advice and a clear quote before you commit.' },
      { n: 'Booking', d: 'Book online in seconds and get instant confirmation.' },
      { n: 'Support', d: 'Friendly support on WhatsApp whenever you need us.' }
    ],
    why: ['Fast, friendly service', 'Transparent pricing', 'Easy online booking'],
    faq: [
      { q: 'How do I book?', a: 'Book right here on the website or message us on WhatsApp — it takes seconds.' },
      { q: 'What are your hours?', a: 'We\u2019re open Monday to Saturday. Message us for exact hours.' },
      { q: 'How do I pay?', a: 'We accept cash, mobile money, and cards.' },
      { q: 'How do I contact you?', a: 'Use the WhatsApp button or call us — details are on this page.' }
    ],
    hours: 'We\u2019re open Monday to Saturday, 8am \u2013 6pm.',
    booking: 'Book or enquire right here — we\u2019ll reply fast and confirm your request.',
    payment: 'We accept cash, mobile money, and card payments.',
    welcome: 'Hi! \ud83d\udc4b Welcome to {business}. How can we help you today?',
    waReply: 'Thanks for contacting {business}! \ud83d\udc4b How can we help?',
    keywords: '{business}, {city}, services'
  };

  /* ------------------------------------------------------------
     Template filling
     ------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fill(tpl, p) {
    return String(tpl)
      .replace(/\{business\}/g, p.business)
      .replace(/\{city\}/g, p.city)
      .replace(/\{phone\}/g, p.phone)
      .replace(/\{name\}/g, p.name)
      .replace(/\{services\}/g, p.serviceNames);
  }

  /* ------------------------------------------------------------
     Auto-naming: clean slugs + a suggested domain for the site.
     ------------------------------------------------------------ */
  function slugify(name) {
    var s = String(name == null ? '' : name).toLowerCase();
    s = s.replace(/&/g, ' and ');
    s = s.replace(/['\u2019\u2018`]/g, '');
    s = s.replace(/[^a-z0-9]+/g, '-');
    s = s.replace(/^-+|-+$/g, '');
    return s || 'business';
  }

  function domainName(name, city) {
    var base = slugify(name).replace(/-/g, '');
    base = base.replace(/^the/, '');
    base = base.replace(/ltd$|limited$|co$|company$|enterprises$|gh$|ghana$/, '');
    if (base.length < 6) {
      base = base + (city ? slugify(city).replace(/-/g, '') : '');
    }
    if (!base) { base = 'mybusiness'; }
    return base + '.com';
  }

  function profileFromInput(input) {
    var type = KB[input.type] ? input.type : 'other';
    var k = KB[type];
    return {
      name: input.name || 'the team',
      business: input.business || 'Your Business',
      type: type,
      typeLabel: k.label,
      city: input.city || CONFIG.fallbackCity,
      phone: input.phone || CONFIG.fallbackPhone,
      package: input.pkg || 'Core',
      tone: input.tone || 'Professional',
      customServices: input.services || '',
      serviceNames: input.services || '',
      /* Client product photos picked from their own gallery. Each entry is
         { src: '<data URI>', caption: 'optional label' } so the generated
         site is still a single self-contained file. */
      photos: (input.photos && input.photos.length) ? input.photos : []
    };
  }

  /* ------------------------------------------------------------
     GENERATOR — returns the full delivery package
     ------------------------------------------------------------ */
  function build(input) {
    var p = profileFromInput(input);
    var k = KB[p.type];

    // services list: custom (comma) if given, else type defaults
    var services = [];
    if (p.customServices) {
      var parts = p.customServices.split(',');
      for (var i = 0; i < parts.length; i++) {
        var s = parts[i].replace(/^\s+|\s+$/g, '');
        if (s) { services.push({ n: s, d: 'Professional ' + s.toLowerCase() + ' delivered to a high standard.' }); }
      }
    }
    if (!services.length) { services = k.services.slice(); }

    var svcNames = [];
    for (var j = 0; j < services.length; j++) { svcNames.push(services[j].n); }
    p.serviceNames = svcNames.join(', ');

    // assistant Q&A (keyed so the site's chatbot can answer by topic)
    var qa = [
      { k: 'hours', q: 'What are your opening hours?', a: k.hours },
      { k: 'location', q: 'Where are you located?', a: p.business + ' is located in ' + p.city + '. Message us for directions or a live location pin.' },
      { k: 'book', q: 'How do I book?', a: k.booking },
      { k: 'price', q: 'How much does it cost?', a: 'Prices depend on what you need. Ask us for a quote \u2014 we\u2019re happy to give an honest, upfront price.' },
      { k: 'pay', q: 'How do I pay?', a: k.payment },
      { k: 'contact', q: 'How do I contact you?', a: 'You can reach us on WhatsApp at +233 ' + p.phone + ' \u2014 we reply fast.' },
      { k: 'services', q: 'What services do you offer?', a: 'We offer: ' + p.serviceNames + '. Ask us about any of them.' }
    ];

    // 7-day plan
    var plan = [
      { day: 'Day 1', task: 'Confirm content: send the client the generated copy + questions (logo, photos, exact prices).' },
      { day: 'Day 2', task: 'Build the website pages using the generated site pack; set up hosting.' },
      { day: 'Day 3', task: 'Configure the AI assistant with the generated Q&A and connect WhatsApp.' },
      { day: 'Day 4', task: 'Wire booking/contact forms + Google Maps; test on mobile and desktop.' },
      { day: 'Day 5', task: 'Client review: share the preview link, collect feedback, make edits.' },
      { day: 'Day 6', task: 'Final polish + SEO titles/descriptions; add analytics.' },
      { day: 'Day 7', task: 'Go live: connect the domain, send the handover message and invoice balance.' }
    ];

    var onboardingWa =
      'Hi ' + p.name + '! \ud83c\udf89 Welcome aboard ' + p.business + ' \u2014 this is NexaFlow AI.\n\n' +
      'Your ' + p.package + ' package is confirmed and your project starts now. Here\u2019s what I need from you to move fast:\n\n' +
      '1) Your logo (if you have one)\n' +
      '2) 5\u201310 photos of your work/space\n' +
      '3) Your exact services & prices\n' +
      '4) Your preferred WhatsApp number for customer chats\n\n' +
      'Reply with these and I\u2019ll have your first preview ready in about 3 days. \ud83d\ude80';

    var onboardingEmailSubject = p.business + ' \u2014 your website project is live';
    var onboardingEmailBody =
      'Hi ' + p.name + ',\n\n' +
      'Thanks for choosing NexaFlow AI. Your ' + p.package + ' package for ' + p.business + ' is confirmed.\n\n' +
      'To get started, please reply with:\n' +
      '- Your logo (if any)\n' +
      '- 5\u201310 photos of your business/work\n' +
      '- Your services and prices\n' +
      '- The WhatsApp number customers should message\n\n' +
      'Timeline: first preview in ~3 days, live in 7.\n\n' +
      'Talk soon,\nNexaFlow AI';

    return {
      profile: p,
      domain: domainName(p.business, p.city),
      meta: {
        title: p.business + ' \u2014 ' + k.tagline + ' | ' + p.city,
        desc: fill(k.heroSub, p).slice(0, 158),
        keywords: fill(k.keywords, p)
      },
      hero: { head: fill(k.heroHead, p), sub: fill(k.heroSub, p) },
      about: { p1: fill(k.about1, p), p2: fill(k.about2, p) },
      services: services,
      why: k.why,
      faq: k.faq,
      assistant: {
        name: 'Nexa AI',
        welcome: fill(k.welcome, p),
        fallback: 'I\u2019m not sure about that one \u2014 but a real human at ' + p.business + ' is one tap away on WhatsApp. Ask me about hours, services, prices, or booking!',
        hours: k.hours,
        waReply: fill(k.waReply, p),
        qa: qa
      },
      onboarding: { wa: onboardingWa, emailSubject: onboardingEmailSubject, emailBody: onboardingEmailBody },
      plan: plan
    };
  }

  /* ------------------------------------------------------------
     Build the full standalone website (single HTML file, no deps)
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     Luxury theme override (appended when style === 'luxury').
     Serif display type, champagne-gold accents, cream background.
     ------------------------------------------------------------ */
  var LUX_CSS =
      '/*---- Luxury theme ----*/\n' +
      'body{font-family:"Jost",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#241f1a;background:#faf7f1;line-height:1.7}\n' +
      'h1,h2,h3,.logo,.card h3,.chat-name{font-family:"Playfair Display",Georgia,"Times New Roman",serif;letter-spacing:.01em}\n' +
      '.eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.3em;font-size:12px;font-weight:600;color:#b2872f;margin-bottom:22px}\n' +
      '.eyebrow::before,.eyebrow::after{content:"";display:inline-block;width:34px;height:1px;background:#c8a24b;vertical-align:middle;margin:0 12px}\n' +
      '.btn{background:#b2872f;background:linear-gradient(135deg,#c8a24b,#a87f2f);color:#fff;border-radius:2px;padding:14px 30px;font-weight:600;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;border:1px solid #a87f2f;box-shadow:0 8px 20px -8px rgba(168,127,47,.55)}\n' +
      '.btn:hover{background:linear-gradient(135deg,#b2872f,#8f6a24);transform:translateY(-1px)}\n' +
      '.btn.alt{background:transparent;color:#241f1a;border:1px solid #c8a24b;box-shadow:none}\n' +
      '.btn.alt:hover{background:#c8a24b;color:#fff}\n' +
      'header{background:rgba(250,247,241,.95);border-bottom:1px solid #e8dfcd}\n' +
      '.logo{font-weight:700;font-size:21px;letter-spacing:.02em}.logo i{color:#c8a24b}\n' +
      '.nav a{color:#5c5346;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}\n' +
      '.nav a:hover{color:#a87f2f}\n' +
      '.burger{color:#241f1a;border:1px solid #d8cbaa}\n' +
      '.hero{padding:96px 0 88px;background:radial-gradient(1000px 500px at 85% -10%,rgba(200,162,75,.16),transparent 55%),linear-gradient(180deg,#fbf8f2,#f5efe3)}\n' +
      '.hero h1{font-size:52px;line-height:1.12;margin-bottom:22px;font-weight:600}\n' +
      '.hero h1 i{color:#b2872f}\n' +
      '.hero p{font-size:18px;color:#6b6152;max-width:600px;margin-bottom:32px}\n' +
      '.hero .trust{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#8b7f6b}\n' +
      '.hero .trust span::before{content:"\\25c6";color:#c8a24b;font-size:10px;margin-right:8px;vertical-align:middle}\n' +
      '.section{padding:88px 0}.soft{background:#f5efe3}\n' +
      'h2{font-size:36px;font-weight:600;margin-bottom:14px}\n' +
      'h2::after{content:"";display:block;width:52px;height:2px;background:#c8a24b;margin:16px auto 0}\n' +
      '.lead{color:#6b6152;font-weight:300}\n' +
      '.grid .card{border:1px solid #e8dfcd;border-radius:2px;background:#fff;box-shadow:0 1px 2px rgba(36,31,26,.04)}\n' +
      '.grid .card:hover{transform:translateY(-4px);box-shadow:0 24px 44px -20px rgba(36,31,26,.22);border-color:#d8cbaa}\n' +
      '.card .icon{width:46px;height:46px;border-radius:50%;background:#faf7f1;color:#b2872f;border:1px solid #d8cbaa;font-family:"Playfair Display",Georgia,serif;font-size:17px;font-style:italic}\n' +
      '.card h3{font-size:19px}\n' +
      '.card p{color:#6b6152}\n' +
      '.why li{color:#5c5346;font-size:15px}\n' +
      '.tick{color:#c8a24b}\n' +
      '.faq-item{border:1px solid #e8dfcd;border-radius:2px;background:#fff}\n' +
      '.faq-item summary{font-weight:600}\n' +
      '.faq-item summary:hover{color:#a87f2f}\n' +
      '.book{background:#fff;border:1px solid #e8dfcd;border-radius:2px;box-shadow:0 1px 2px rgba(36,31,26,.04),0 18px 36px -18px rgba(36,31,26,.14)}\n' +
      '.book input,.book select,.book textarea{border:1px solid #e8dfcd;border-radius:2px;background:#fdfbf7}\n' +
      '.book input:focus,.book select:focus,.book textarea:focus{border-color:#c8a24b}\n' +
      '.gal .p{background:linear-gradient(135deg,#f5efe3,#fbf8f2);border:1px solid #e2d7bf;color:#a98a4a;font-family:"Playfair Display",Georgia,serif;letter-spacing:.06em}\n' +
      '.map-wrap{border:1px solid #e8dfcd;border-radius:2px}\n' +
      '.loc-cards .lc{border:1px solid #e8dfcd;border-radius:2px;color:#6b6152}\n' +
      '.loc-cards .lc b{color:#241f1a;font-family:"Playfair Display",Georgia,serif;letter-spacing:.04em}\n' +
      'footer{background:#181410;color:#cbbfa8;font-size:13px;letter-spacing:.08em}\n' +
      '.credits a{color:#d4af37}\n' +
      '.chat-bubble{background:linear-gradient(135deg,#c8a24b,#a87f2f)}\n' +
      '.chat-win{border:1px solid #e8dfcd;border-radius:2px}\n' +
      '.chat-head{background:linear-gradient(180deg,#fbf8f2,#fff)}\n' +
      '.chat-ava{background:linear-gradient(135deg,#c8a24b,#a87f2f)}\n' +
      '.chat-name{font-size:15px}\n' +
      '.m.user .mb{background:linear-gradient(135deg,#c8a24b,#a87f2f)}\n' +
      '.mb-wa{background:#128c46}\n' +
      '.chip:hover{border-color:#c8a24b;color:#a87f2f;background:#faf7f1}\n' +
      '.chat-input button{background:linear-gradient(135deg,#c8a24b,#a87f2f)}\n' +
      '.wa-float{background:#128c46;border-radius:2px;letter-spacing:.04em}\n' +
      '@media(max-width:820px){.hero h1{font-size:38px}.eyebrow{letter-spacing:.2em}}\n';

  /* ------------------------------------------------------------
     Noir theme override (appended when style === 'dark').
     Deep charcoal with champagne-gold accents, serif display type.
     ------------------------------------------------------------ */
  var DARK_CSS =
      '/*---- Noir theme ----*/\n' +
      'body{font-family:"Jost",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e9e5dd;background:#0b0d11;line-height:1.7}\n' +
      'h1,h2,h3,.logo,.card h3,.chat-name{font-family:"Playfair Display",Georgia,"Times New Roman",serif;letter-spacing:.01em}\n' +
      '.eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.32em;font-size:12px;font-weight:600;color:#d4af37;margin-bottom:22px}\n' +
      '.eyebrow::before,.eyebrow::after{content:"";display:inline-block;width:34px;height:1px;background:#d4af37;vertical-align:middle;margin:0 12px}\n' +
      '.btn{background:linear-gradient(135deg,#d4af37,#a8842c);color:#0b0d11;border-radius:2px;padding:14px 30px;font-weight:600;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;border:1px solid #d4af37;box-shadow:0 8px 20px -8px rgba(212,175,55,.45)}\n' +
      '.btn:hover{background:linear-gradient(135deg,#e2c14f,#93701f)}\n' +
      '.btn.alt{background:transparent;color:#e9e5dd;border:1px solid #d4af37;box-shadow:none}\n' +
      '.btn.alt:hover{background:#d4af37;color:#0b0d11}\n' +
      'header{background:rgba(11,13,17,.92);border-bottom:1px solid #1e222a}\n' +
      '.logo{font-weight:700;font-size:21px;letter-spacing:.02em}.logo i{color:#d4af37}\n' +
      '.nav a{color:#b7b2a6;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}\n' +
      '.nav a:hover{color:#d4af37}\n' +
      '.burger{color:#e9e5dd;border:1px solid #2a2f3a}\n' +
      '.hero{padding:96px 0 88px;background:radial-gradient(1000px 500px at 85% -10%,rgba(212,175,55,.12),transparent 55%),linear-gradient(180deg,#0e1116,#0b0d11)}\n' +
      '.hero h1{font-size:52px;line-height:1.12;margin-bottom:22px;font-weight:600}\n' +
      '.hero h1 i{color:#d4af37}\n' +
      '.hero p{font-size:18px;color:#a8a396;max-width:600px;margin-bottom:32px}\n' +
      '.hero .trust{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#8d887b}\n' +
      '.hero .trust span::before{content:"\\25c6";color:#d4af37;font-size:10px;margin-right:8px;vertical-align:middle}\n' +
      '.section{padding:88px 0}.soft{background:#0e1116}\n' +
      'h2{font-size:36px;font-weight:600;margin-bottom:14px}\n' +
      'h2::after{content:"";display:block;width:52px;height:2px;background:#d4af37;margin:16px auto 0}\n' +
      '.lead{color:#a8a396;font-weight:300}\n' +
      '.grid .card{border:1px solid #1e222a;border-radius:2px;background:#12151b;box-shadow:0 1px 2px rgba(0,0,0,.3)}\n' +
      '.grid .card:hover{transform:translateY(-4px);box-shadow:0 24px 44px -20px rgba(0,0,0,.6);border-color:#2a2f3a}\n' +
      '.card .icon{width:46px;height:46px;border-radius:50%;background:#0e1116;color:#d4af37;border:1px solid #2a2f3a;font-family:"Playfair Display",Georgia,serif;font-size:17px;font-style:italic}\n' +
      '.card h3{font-size:19px}\n' +
      '.card p{color:#a8a396}\n' +
      '.why li{color:#c9c4b8;font-size:15px}\n' +
      '.tick{color:#d4af37}\n' +
      '.faq-item{border:1px solid #1e222a;border-radius:2px;background:#12151b}\n' +
      '.faq-item summary{font-weight:600}\n' +
      '.faq-item summary:hover{color:#d4af37}\n' +
      '.faq-item p{color:#a8a396}\n' +
      '.book{background:#12151b;border:1px solid #1e222a;border-radius:2px;box-shadow:0 18px 36px -18px rgba(0,0,0,.5)}\n' +
      '.book input,.book select,.book textarea{border:1px solid #1e222a;border-radius:2px;background:#0e1116;color:#e9e5dd}\n' +
      '.book input:focus,.book select:focus,.book textarea:focus{border-color:#d4af37}\n' +
      '.gal .p{background:linear-gradient(135deg,#0e1116,#12151b);border:1px solid #1e222a;color:#d4af37;font-family:"Playfair Display",Georgia,serif;letter-spacing:.06em}\n' +
      '.map-wrap{border:1px solid #1e222a;border-radius:2px}\n' +
      '.loc-cards .lc{border:1px solid #1e222a;border-radius:2px;color:#a8a396;background:#12151b}\n' +
      '.loc-cards .lc b{color:#e9e5dd;font-family:"Playfair Display",Georgia,serif;letter-spacing:.04em}\n' +
      'footer{background:#08090c;color:#8d887b;font-size:13px;letter-spacing:.08em}\n' +
      '.credits a{color:#d4af37}\n' +
      '.nav.open{background:#0e1116;border-bottom:1px solid #1e222a}\n' +
      '.chat-bubble{background:linear-gradient(135deg,#d4af37,#a8842c)}\n' +
      '.chat-win{border:1px solid #1e222a;border-radius:2px}\n' +
      '.chat-head{background:linear-gradient(180deg,#12151b,#0e1116)}\n' +
      '.chat-ava{background:linear-gradient(135deg,#d4af37,#a8842c)}\n' +
      '.chat-name{font-size:15px}\n' +
      '.chat-body{background:#0b0d11}\n' +
      '.chat-close{background:#1e222a;color:#c9c4b8}\n' +
      '.m.user .mb{background:linear-gradient(135deg,#d4af37,#a8842c);color:#0b0d11}\n' +
      '.m.bot .mb{background:#12151b;border:1px solid #1e222a;color:#c9c4b8}\n' +
      '.mb-wa{background:#128c46}\n' +
      '.chat-chips{background:#12151b;border-top:1px solid #1e222a}\n' +
      '.chip{border:1px solid #1e222a;background:#12151b;color:#c9c4b8}\n' +
      '.chip:hover{border-color:#d4af37;color:#d4af37;background:#0e1116}\n' +
      '.chat-input{background:#12151b}\n' +
      '.chat-input input{border:1px solid #1e222a;background:#0e1116;color:#e9e5dd}\n' +
      '.chat-input input:focus{border-color:#d4af37}\n' +
      '.chat-input button{background:linear-gradient(135deg,#d4af37,#a8842c);color:#0b0d11}\n' +
      '.wa-float{background:#128c46;border-radius:2px;letter-spacing:.04em}\n' +
      '@media(max-width:820px){.hero h1{font-size:38px}.eyebrow{letter-spacing:.2em}}\n';

  function buildSiteHtml(d, style) {
    var p = d.profile;
    var lux = (style === 'luxury' || style === 'dark');
    var isDark = (style === 'dark');

    function waDigits(phone) {
      var dg = String(phone || '').replace(/[^0-9]/g, '');
      if (dg.indexOf('233') === 0) { dg = dg.slice(3); }
      if (dg.charAt(0) === '0') { dg = dg.slice(1); }
      return dg ? ('233' + dg) : '233545886354';
    }
    var wa = waDigits(p.phone);

    function roman(n) {
      var map = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100],
        ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5],
        ['IV', 4], ['I', 1]];
      var s = '';
      for (var r = 0; r < map.length; r++) {
        while (n >= map[r][1]) { s += map[r][0]; n -= map[r][1]; }
      }
      return s;
    }

    // services markup + names + booking options
    var svcHtml = '';
    var svcNames = [];
    var svcOptions = '';
    for (var i = 0; i < d.services.length; i++) {
      svcNames.push(d.services[i].n);
      svcHtml += '<div class="card rv"><div class="icon">' + (lux ? roman(i + 1) : '\u2713') + '</div><h3>' + esc(d.services[i].n) + '</h3><p>' + esc(d.services[i].d) + '</p></div>';
      svcOptions += '<option>' + esc(d.services[i].n) + '</option>';
    }

    var whyHtml = '';
    for (var w = 0; w < d.why.length; w++) {
      whyHtml += '<li><span class="tick">' + (lux ? '\u25c6' : '\u2713') + '</span>' + esc(d.why[w]) + '</li>';
    }

    var faqHtml = '';
    for (var f = 0; f < d.faq.length; f++) {
      faqHtml += '<details class="faq-item"><summary>' + esc(d.faq[f].q) + '</summary><p>' + esc(d.faq[f].a) + '</p></details>';
    }

    /* Gallery: the client's own product photos when they were supplied,
       otherwise the placeholder tiles that tell them what to add. */
    var photos = (p.photos && p.photos.length) ? p.photos : [];
    var hasPhotos = photos.length > 0;
    var galHtml = '';
    for (var g = 0; g < photos.length; g++) {
      var src = String(photos[g] && photos[g].src ? photos[g].src : '');
      if (src.indexOf('data:image/') !== 0) { continue; }   // only embedded images
      var cap = String(photos[g].caption || '').replace(/^\s+|\s+$/g, '');
      var altText = cap ? (cap + ' \u2014 ' + p.business) : (p.business + ' product photo ' + (g + 1));
      galHtml += '<figure class="p ph rv"><img src="' + esc(src) + '" alt="' + esc(altText) + '" loading="lazy">' +
        (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
    }
    if (!galHtml) {
      for (var gp = 0; gp < 6; gp++) {
        galHtml += '<div class="p"><i>\ud83d\udcf7</i>Your photo here</div>';
      }
    }

    // safe JSON blob for the site's own script
    var dataJson = JSON.stringify({
      business: p.business,
      city: p.city,
      wa: wa,
      hours: d.assistant.hours,
      welcome: d.assistant.welcome,
      fallback: d.assistant.fallback,
      services: svcNames,
      qa: d.assistant.qa
    }).replace(/</g, '\\u003c');

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '<meta charset="UTF-8" />\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
      '<title>' + esc(d.meta.title) + '</title>\n' +
      '<!-- Suggested domain: ' + esc(d.domain) + ' -->\n' +
      '<meta name="description" content="' + esc(d.meta.desc) + '" />\n' +
      '<meta name="keywords" content="' + esc(d.meta.keywords) + '" />\n' +
      '<meta property="og:title" content="' + esc(d.meta.title) + '" />\n' +
      '<meta property="og:description" content="' + esc(d.meta.desc) + '" />\n' +
      '<meta property="og:type" content="website" />\n' +
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'8\' fill=\'%234f46e5\'/%3E%3Cpath d=\'M17.5 5 9 18h5l-1.5 9L22 14h-5z\' fill=\'white\'/%3E%3C/svg%3E" />\n' +
      (lux ? '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />\n' : '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />\n') +
      '<style>\n' +
      '*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;background:#fff;-webkit-font-smoothing:antialiased}\n' +
      'a{color:inherit;text-decoration:none}img,svg{max-width:100%;display:block}ul{list-style:none;padding:0;margin:0}h1,h2,h3{margin:0;line-height:1.15;letter-spacing:-.02em;font-family:Montserrat,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}p{margin:0}\n' +
      '.wrap{max-width:1080px;margin:0 auto;padding:0 22px}\n' +
      '.btn{display:inline-block;background:#4f46e5;color:#fff;border-radius:999px;padding:12px 24px;font-weight:600;font-size:15px;font-family:Montserrat,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;transition:background .15s ease,transform .15s ease}\n' +
      '.btn:hover{background:#4338ca}.btn.alt{background:#fff;color:#0f172a;border:1px solid #e5e9f0}\n' +
      'header{position:sticky;top:0;background:rgba(255,255,255,.92);border-bottom:1px solid #eef1f6;z-index:50}\n' +
      '.bar{display:flex;align-items:center;justify-content:space-between;height:66px}\n' +
      '.logo{font-weight:800;font-size:19px;letter-spacing:-.02em;font-family:Montserrat,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}.logo i{color:#4f46e5;font-style:normal}\n' +
      '.nav a{font-size:15px;font-weight:500;color:#334155;margin-left:24px;transition:color .15s}\n' +
      '.nav a:hover{color:#4f46e5}.hd-cta{margin-left:24px}\n' +
      '.burger{display:none;background:none;border:1px solid #e5e9f0;border-radius:10px;width:42px;height:42px;font-size:20px;color:#0f172a;cursor:pointer}\n' +
      '.hero{padding:84px 0 76px;background:radial-gradient(900px 440px at 85% -10%,#eef2ff,transparent 55%),radial-gradient(rgba(79,70,229,.05) 1px,transparent 1.4px),#fff;background-size:auto,20px 20px,auto}\n' +
      '.hero h1{font-size:46px;letter-spacing:-.03em;line-height:1.08;margin-bottom:20px}\n' +
      '.hero h1 i{color:#4f46e5;font-style:normal}\n' +
      '.hero p{font-size:18px;color:#5b6779;max-width:560px;margin-bottom:30px}\n' +
      '.hero .btns a{margin:0 12px 12px 0}\n' +
      '.hero .trust{margin-top:34px;font-size:14px;color:#64748b}\n' +
      '.hero .trust span{margin-right:22px;display:inline-block}\n' +
      '.hero .trust span::before{content:"\u2713";color:#16a34a;font-weight:700;margin-right:6px}\n' +
      '.section{padding:76px 0}.soft{background:#f7f9fc}\n' +
      '.center{text-align:center}h2{font-size:31px;letter-spacing:-.02em;margin-bottom:12px}\n' +
      '.lead{color:#5b6779;font-size:16.5px;max-width:620px;margin:0 auto}\n' +
      '.grid{display:flex;flex-wrap:wrap;margin:-10px;margin-top:34px}\n' +
      '.grid .card{width:calc(50% - 20px);margin:10px;background:#fff;border:1px solid #e5e9f0;border-radius:16px;padding:26px;text-align:left;transition:transform .18s ease,box-shadow .18s ease}\n' +
      '.grid .card:hover{transform:translateY(-4px);box-shadow:0 14px 28px -12px rgba(15,23,42,.16)}\n' +
      '.card .icon{width:40px;height:40px;border-radius:11px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:16px}\n' +
      '.card h3{font-size:18px;margin-bottom:8px}.card p{font-size:14.5px;color:#5b6779}\n' +
      '.split{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start}\n' +
      '.split .half{width:48%}\n' +
      '.why li{position:relative;padding-left:28px;margin-bottom:12px;font-size:15px;color:#334155}\n' +
      '.tick{position:absolute;left:0;top:1px;color:#16a34a;font-weight:700}\n' +
      '.faq-item{border:1px solid #e5e9f0;border-radius:12px;background:#fff;padding:0;margin-bottom:12px;overflow:hidden}\n' +
      '.faq-item summary{padding:17px 20px;font-weight:700;font-size:15.5px;cursor:pointer}\n' +
      '.faq-item summary:hover{color:#4f46e5}\n' +
      '.faq-item p{padding:0 20px 18px;color:#5b6779;font-size:14.5px}\n' +
      '.book{background:#fff;border:1px solid #e5e9f0;border-radius:18px;padding:30px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 14px 30px -14px rgba(15,23,42,.14)}\n' +
      '.book input,.book select,.book textarea{width:100%;padding:13px 15px;border:1px solid #e5e9f0;border-radius:10px;font:inherit;font-size:15px;margin-bottom:12px;background:#fff}\n' +
      '.book input:focus,.book select:focus,.book textarea:focus{outline:none;border-color:#4f46e5}\n' +
      '.book textarea{min-height:80px;resize:vertical}\n' +
      '.book .hint{margin-top:10px;font-size:13.5px;color:#16a34a}\n' +
      'footer{background:#0b1220;color:#cbd5e1;padding:46px 0;margin-top:60px;text-align:center;font-size:14.5px}\n' +
      '.credits{margin-top:14px;font-size:12.5px;opacity:.92}\n' +
      '.credits a{color:#a5b4fc;text-decoration:none;font-weight:600}\n' +
      '.credits a:hover{text-decoration:underline}\n' +
      '.wa-float{position:fixed;left:18px;bottom:18px;z-index:60;background:#16a34a;color:#fff;border-radius:999px;padding:13px 20px;font-weight:700;font-size:14.5px;box-shadow:0 10px 24px -8px rgba(22,163,74,.5)}\n' +
      '.chat-bubble{position:fixed;right:18px;bottom:18px;z-index:60;width:58px;height:58px;border-radius:50%;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px -8px rgba(79,70,229,.55)}\n' +
      '.chat-bubble svg{width:26px;height:26px}\n' +
      '.chat-win{position:fixed;right:18px;bottom:88px;z-index:60;width:340px;max-width:calc(100% - 36px);background:#fff;border:1px solid #e5e9f0;border-radius:18px;box-shadow:0 24px 48px -16px rgba(15,23,42,.3);display:none;flex-direction:column;overflow:hidden}\n' +
      '.chat-win.open{display:flex}\n' +
      '.chat-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #e5e9f0;background:linear-gradient(180deg,#fbfcff,#fff)}\n' +
      '.chat-ava{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:11px}\n' +
      '.chat-name{font-weight:700;font-size:14.5px}.chat-status{font-size:12px;color:#16a34a}\n' +
      '.chat-close{margin-left:auto;background:#f1f5f9;border:none;border-radius:8px;width:30px;height:30px;color:#64748b;cursor:pointer;font-size:14px}\n' +
      '.chat-body{height:300px;overflow-y:auto;padding:16px;background:#f7f9fc}\n' +
      '.m{display:flex;flex-direction:column;margin-bottom:10px}\n' +
      '.m .mb{max-width:82%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;word-wrap:break-word}\n' +
      '.m.user{align-items:flex-end}.m.user .mb{background:#4f46e5;color:#fff;border-bottom-right-radius:4px}\n' +
      '.m.bot{align-items:flex-start}.m.bot .mb{background:#fff;border:1px solid #e5e9f0;color:#334155;border-bottom-left-radius:4px}\n' +
      '.mb-wa{display:inline-block;margin-top:8px;background:#16a34a;color:#fff;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600}\n' +
      '.typing span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#94a3b8;margin-right:4px;animation:blink 1s infinite}\n' +
      '.typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}\n' +
      '@keyframes blink{0%,100%{opacity:.25}50%{opacity:1}}\n' +
      '.chat-chips{display:flex;flex-wrap:wrap;padding:10px 12px;background:#fff;border-top:1px solid #eef1f6}\n' +
      '.chip{border:1px solid #e5e9f0;background:#fff;color:#334155;border-radius:999px;padding:7px 13px;font-size:12.5px;font-weight:600;margin:0 8px 8px 0;cursor:pointer}\n' +
      '.chip:hover{border-color:#4f46e5;color:#4f46e5;background:#eef2ff}\n' +
      '.chat-input{display:flex;align-items:center;padding:10px 12px;background:#fff}\n' +
      '.chat-input input{flex:1 1 auto;border:1px solid #e5e9f0;border-radius:999px;padding:11px 16px;font:inherit;font-size:14px}\n' +
      '.chat-input input:focus{outline:none;border-color:#4f46e5}\n' +
      '.chat-input button{margin-left:8px;width:44px;height:44px;border-radius:50%;background:#4f46e5;color:#fff;border:none;cursor:pointer;font-size:16px}\n' +
      'html.js .rv{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}\n' +
      'html.js .rv.in{opacity:1;transform:none}\n' +
      '@media(max-width:820px){.grid .card,.split .half{width:calc(100% - 20px)}.split .half{width:100%}\n' +
      '.nav{display:none}.nav.open{display:flex;position:absolute;top:66px;left:0;right:0;flex-direction:column;background:#fff;border-bottom:1px solid #eef1f6;padding:12px 22px 18px}\n' +
      '.nav.open a{margin:8px 0}.burger{display:block}.hd-cta{display:none}.hero h1{font-size:33px}}\n' +
      '.gal{display:flex;flex-wrap:wrap;margin:-8px;margin-top:34px}\n' +
      '.gal .p{width:calc(33.333% - 16px);margin:8px;height:170px;border-radius:14px;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px dashed #c7d2fe;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#818cf8;font-size:13px;font-weight:600;padding:12px}\n' +
      '.gal .p i{font-style:normal;font-size:28px;margin-bottom:8px}\n' +
      '.gal .p.ph{padding:0;overflow:hidden;border-style:solid;background:#0b0d12;position:relative}\n' +
      '.gal .p.ph img{width:100%;height:100%;object-fit:cover;display:block}\n' +
      '.gal .p.ph figcaption{position:absolute;left:0;right:0;bottom:0;padding:18px 12px 9px;font-size:12.5px;font-weight:700;color:#fff;background:linear-gradient(to top,rgba(8,10,14,.78),rgba(8,10,14,0));text-align:left}\n' +
      '.map-wrap{margin-top:24px;border:1px solid #e5e9f0;border-radius:16px;overflow:hidden;background:#f7f9fc;min-height:200px}\n' +
      '.map-wrap iframe{width:100%;height:300px;border:0;display:block}\n' +
      '.loc-cards{display:flex;flex-wrap:wrap;margin:-8px;margin-top:26px}\n' +
      '.loc-cards .lc{width:calc(33.333% - 16px);margin:8px;background:#fff;border:1px solid #e5e9f0;border-radius:14px;padding:20px;font-size:14px;color:#5b6779}\n' +
      '.loc-cards .lc b{display:block;color:#0f172a;margin-bottom:6px;font-size:14px}\n' +
      '@media(max-width:820px){.gal .p,.loc-cards .lc{width:calc(50% - 16px)}}\n' +
      '@media(max-width:520px){.gal .p,.loc-cards .lc{width:calc(100% - 16px)}}\n' +
      ((style === 'luxury') ? LUX_CSS : '') +
      (isDark ? DARK_CSS : '') +
      '</style>\n</head>\n<body id="top">\n' +
      '<header><div class="wrap bar">' +
      '<a class="logo" href="#top">' + esc(p.business) + ' <i>\u25cf</i></a>' +
      '<nav class="nav" id="nav">' +
      '<a href="#services">Services</a><a href="#gallery">Gallery</a><a href="#about">About</a><a href="#faq">FAQ</a><a href="#visit">Visit</a><a href="#contact">Contact</a>' +
      '</nav>' +
      '<a class="btn hd-cta" href="#contact">Book Now</a>' +
      '<button class="burger" id="burger" type="button" aria-label="Menu">\u2630</button>' +
      '</div></header>\n' +
      '<section class="hero"><div class="wrap">' +
      (lux && p.city ? '<div class="eyebrow">' + esc(p.city) + '</div>' : '') +
      '<h1>' + esc(d.hero.head) + '</h1>' +
      '<p>' + esc(d.hero.sub) + '</p>' +
      '<div class="btns"><a class="btn" href="#contact">Book an Appointment</a>' +
      '<a class="btn alt" href="https://wa.me/' + wa + '">Chat on WhatsApp</a></div>' +
      '<div class="trust"><span>Fast response</span><span>' + esc(p.city) + '</span><span>Online booking</span></div>' +
      '</div></section>\n' +
      '<section class="section" id="services"><div class="wrap center">' +
      '<h2>' + (lux ? 'Our Signature Services' : 'What we offer') + '</h2><p class="lead">' + (lux ? 'Curated with care, delivered with excellence.' : 'Everything you need, done properly.') + '</p>' +
      '<div class="grid">' + svcHtml + '</div></div></section>\n' +
      '<section class="section" id="gallery"><div class="wrap center">' +
      '<h2>' + (lux ? 'A Glimpse of Our Craft' : 'Our work') + '</h2><p class="lead">' +
        (hasPhotos
          ? (lux ? 'Selected pieces from our studio.' : 'Real work from our team.')
          : (lux ? 'A preview of our finest work \u2014 replace these with your own photography.' : 'A glimpse of what we do \u2014 swap these for your real photos.')) +
      '</p>' +
      '<div class="gal">' + galHtml + '</div></div></section>\n' +
      '<section class="section soft" id="about"><div class="wrap">' +
      '<h2>About ' + esc(p.business) + '</h2>' +
      '<div class="split"><div class="half"><p class="lead" style="margin:0 0 14px;max-width:none;">' + esc(d.about.p1) + '</p>' +
      '<p class="lead" style="max-width:none;">' + esc(d.about.p2) + '</p></div>' +
      '<div class="half"><h2 style="font-size:22px;margin-top:8px;">Why choose us</h2><ul class="why" style="margin-top:18px;">' + whyHtml + '</ul></div>' +
      '</div></div></section>\n' +
      '<section class="section" id="faq"><div class="wrap"><div class="center" style="margin-bottom:30px;"><h2>' + (lux ? 'Frequently Asked' : 'Questions, answered') + '</h2></div>' +
      faqHtml + '</div></section>\n' +
      '<section class="section soft" id="visit"><div class="wrap">' +
      '<div class="center" style="margin-bottom:30px;"><h2>Visit us</h2><p class="lead">Find us in ' + esc(p.city) + ' \u2014 tap the button for directions.</p></div>' +
      '<div class="loc-cards">' +
      '<div class="lc"><b>\ud83d\udccd Location</b>' + esc(p.city) + '</div>' +
      '<div class="lc"><b>\u23f0 Hours</b>' + esc(d.assistant.hours) + '</div>' +
      '<div class="lc"><b>\ud83d\udcac Contact</b>WhatsApp +233 ' + wa.slice(3) + '</div>' +
      '</div>' +
      '<div class="map-wrap"><iframe src="https://www.google.com/maps?q=' + encodeURIComponent(p.business + ' ' + p.city) + '&output=embed" loading="lazy" title="Map"></iframe></div>' +
      '<div class="center" style="margin-top:16px;"><a class="btn alt" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.business + ' ' + p.city) + '" target="_blank" rel="noopener">Open in Google Maps</a></div>' +
      '</div></section>\n' +
      '<section class="section soft" id="contact"><div class="wrap center">' +
      '<h2>' + (lux ? 'Reserve with ' : 'Book with ') + esc(p.business) + '</h2>' +
      '<p class="lead" style="margin-bottom:28px;">' + (lux ? 'Share your requirements — your request opens in WhatsApp, ready to send.' : 'Tell us what you need — it opens WhatsApp with your request ready to send.') + '</p>' +
      '<div class="book" style="max-width:520px;margin:0 auto;text-align:left;">' +
      '<form id="bookForm">' +
      '<input id="bfName" type="text" placeholder="Your name *" />' +
      '<input id="bfPhone" type="tel" placeholder="Phone / WhatsApp number" />' +
      '<select id="bfService">' + svcOptions + '</select>' +
      '<input id="bfDate" type="text" placeholder="Preferred date / time (optional)" />' +
      '<textarea id="bfMsg" placeholder="Anything else we should know? (optional)"></textarea>' +
      '<button class="btn" type="submit" style="width:100%;">Send booking request</button>' +
      '<p class="hint" id="bookHint"></p>' +
      '</form></div></div></section>\n' +
      '<footer><div class="wrap">\u00a9 ' + new Date().getFullYear() + ' ' + esc(p.business) + ' \u2014 ' + esc(p.city) + ' \u00b7 WhatsApp +233 ' + wa.slice(3) +
      '<div class="credits">Website built with <a href="https://nexaflowai.surge.sh/?ref=' + encodeURIComponent(slugify(p.business)) + '" target="_blank" rel="noopener">NexaFlow AI</a> \u2014 AI websites &amp; WhatsApp automation</div>' +
      '</div></footer>\n' +
      '<a class="wa-float" href="https://wa.me/' + wa + '">\ud83d\udcac WhatsApp us</a>\n' +
      '<div class="chat-bubble" id="chatBubble" role="button" aria-label="Chat with our assistant">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-4.4-1.2L3 20l1.3-4.6A8.4 8.4 0 1 1 21 11.5z"/></svg>' +
      '</div>\n' +
      '<div class="chat-win" id="chatWin">' +
      '<div class="chat-head"><div class="chat-ava">\ud83e\udd16</div>' +
      '<div><div class="chat-name">' + esc(p.business) + ' Assistant</div><div class="chat-status">Online \u2014 replies instantly</div></div>' +
      '<button class="chat-close" id="chatClose" type="button" aria-label="Close chat">\u2715</button></div>' +
      '<div class="chat-body" id="chatBody"></div>' +
      '<div class="chat-chips">' +
      '<button class="chip" type="button" data-q="What are your opening hours?">\u23f0 Hours</button>' +
      '<button class="chip" type="button" data-q="Where are you located?">\ud83d\udccd Location</button>' +
      '<button class="chip" type="button" data-q="How much does it cost?">\ud83d\udcb0 Prices</button>' +
      '<button class="chip" type="button" data-q="How do I book?">\ud83d\udcc5 Book</button>' +
      '<button class="chip" type="button" data-q="What services do you offer?">\u2728 Services</button>' +
      '</div>' +
      '<form class="chat-input" id="chatForm"><input id="chatInput" type="text" placeholder="Ask me anything\u2026" autocomplete="off" /><button type="submit" aria-label="Send">\u27a4</button></form>' +
      '</div>\n' +
      '<script type="application/json" id="nxdata">' + dataJson + '</script>\n' +
      '<script>\n' +
      '(function () {\n' +
      '  "use strict";\n' +
      '  var DATA = { qa: [], business: "", city: "", wa: "", hours: "", welcome: "", fallback: "", services: [] };\n' +
      '  try { DATA = JSON.parse(document.getElementById("nxdata").textContent); } catch (e) {}\n' +
      '  function byKey(key) { for (var i = 0; i < DATA.qa.length; i++) { if (DATA.qa[i].k === key) { return DATA.qa[i].a; } } return ""; }\n' +
      '  function answer(q) {\n' +
      '    var t = " " + q.toLowerCase() + " ";\n' +
      '    if (/(hi|hello|hey|good morning|good afternoon|good evening)/.test(t) && t.length < 40) { return DATA.welcome; }\n' +
      '    if (/thank/.test(t)) { return "You\'re welcome! Anything else I can help with?"; }\n' +
      '    if (/hour|open|close|time|when|schedule|today|tomorrow/.test(t)) { return byKey("hours"); }\n' +
      '    if (/where|location|address|direction|find|near/.test(t)) { return byKey("location"); }\n' +
      '    if (/book|appoint|reserve|slot|schedule/.test(t)) { return byKey("book"); }\n' +
      '    if (/price|cost|how much|charge|fee|rate/.test(t)) { return byKey("price"); }\n' +
      '    if (/pay|payment|momo|mobile money|card|cash|transfer/.test(t)) { return byKey("pay"); }\n' +
      '    if (/contact|whatsapp|phone|call|reach|message/.test(t)) { return byKey("contact"); }\n' +
      '    if (/service|offer|provide|do you do/.test(t)) { return byKey("services"); }\n' +
      '    return DATA.fallback;\n' +
      '  }\n' +
      '  var burger = document.getElementById("burger"), nav = document.getElementById("nav");\n' +
      '  if (burger && nav) { burger.addEventListener("click", function () { nav.classList.toggle("open"); }); }\n' +
      '  var links = nav ? nav.getElementsByTagName("a") : [];\n' +
      '  for (var li = 0; li < links.length; li++) { links[li].addEventListener("click", function () { nav.classList.remove("open"); }); }\n' +
      '  var bf = document.getElementById("bookForm");\n' +
      '  if (bf) {\n' +
      '    bf.addEventListener("submit", function (e) {\n' +
      '      e.preventDefault();\n' +
      '      var name = (document.getElementById("bfName").value || "").replace(/^\\s+|\\s+$/g, "");\n' +
      '      var phone = (document.getElementById("bfPhone").value || "").replace(/^\\s+|\\s+$/g, "");\n' +
      '      var svc = document.getElementById("bfService").value;\n' +
      '      var date = (document.getElementById("bfDate").value || "").replace(/^\\s+|\\s+$/g, "");\n' +
      '      var msg = (document.getElementById("bfMsg").value || "").replace(/^\\s+|\\s+$/g, "");\n' +
      '      var hint = document.getElementById("bookHint");\n' +
      '      if (!name) { hint.textContent = "Please enter your name."; hint.style.color = "#dc2626"; return; }\n' +
      '      var NL = String.fromCharCode(10);\n' +
      '      var text = "Hi " + DATA.business + "! I would like to book:" + NL + "• Service: " + svc;\n' +
      '      if (date) { text += NL + "• When: " + date; }\n' +
      '      if (phone) { text += NL + "• My number: " + phone; }\n' +
      '      if (msg) { text += NL + "• Note: " + msg; }\n' +
      '      window.open("https://wa.me/" + DATA.wa + "?text=" + encodeURIComponent(text), "_blank");\n' +
      '      hint.style.color = "#16a34a";\n' +
      '      hint.textContent = "\u2713 Opening WhatsApp \u2014 just press send to confirm your booking!";\n' +
      '    });\n' +
      '  }\n' +
      '  var win = document.getElementById("chatWin"), bubble = document.getElementById("chatBubble"),\n' +
      '      closeBtn = document.getElementById("chatClose"), body = document.getElementById("chatBody"),\n' +
      '      form = document.getElementById("chatForm"), input = document.getElementById("chatInput");\n' +
      '  var opened = false;\n' +
      '  function addMsg(text, who, waLink) {\n' +
      '    var row = document.createElement("div"); row.className = "m " + who;\n' +
      '    var b = document.createElement("div"); b.className = "mb"; b.textContent = text; row.appendChild(b);\n' +
      '    if (waLink) { var a = document.createElement("a"); a.className = "mb-wa"; a.href = "https://wa.me/" + DATA.wa; a.target = "_blank"; a.rel = "noopener"; a.textContent = "\u2192 Chat on WhatsApp"; row.appendChild(a); }\n' +
      '    body.appendChild(row); body.scrollTop = body.scrollHeight;\n' +
      '  }\n' +
      '  function reply(text) {\n' +
      '    var t = document.createElement("div"); t.className = "m bot typing"; t.innerHTML = "<div class=\'mb\'><span></span><span></span><span></span></div>";\n' +
      '    body.appendChild(t); body.scrollTop = body.scrollHeight;\n' +
      '    setTimeout(function () { body.removeChild(t); addMsg(answer(text), "bot", true); }, 650);\n' +
      '  }\n' +
      '  function openChat() { if (!opened) { opened = true; setTimeout(function () { addMsg(DATA.welcome, "bot"); }, 250); } win.classList.add("open"); bubble.style.display = "none"; }\n' +
      '  function closeChat() { win.classList.remove("open"); bubble.style.display = "flex"; }\n' +
      '  if (bubble) { bubble.addEventListener("click", openChat); }\n' +
      '  if (closeBtn) { closeBtn.addEventListener("click", closeChat); }\n' +
      '  if (form) { form.addEventListener("submit", function (e) { e.preventDefault(); var v = (input.value || "").replace(/^\\s+|\\s+$/g, ""); if (!v) { return; } addMsg(v, "user"); input.value = ""; reply(v); }); }\n' +
      '  var chips = document.querySelectorAll(".chip");\n' +
      '  for (var c = 0; c < chips.length; c++) { chips[c].addEventListener("click", function () { var q = this.getAttribute("data-q"); addMsg(q, "user"); reply(q); }); }\n' +
      '  if (typeof window.IntersectionObserver === "function") {\n' +
      '    document.documentElement.className += " js";\n' +
      '    var io = new IntersectionObserver(function (entries) { for (var i = 0; i < entries.length; i++) { if (entries[i].isIntersecting) { entries[i].target.classList.add("in"); io.unobserve(entries[i].target); } } }, { threshold: 0.12 });\n' +
      '    var rvs = document.querySelectorAll(".rv");\n' +
      '    for (var r = 0; r < rvs.length; r++) { io.observe(rvs[r]); }\n' +
      '  }\n' +
      '})();\n' +
      '</script>\n</body>\n</html>\n';
  }

  /* ------------------------------------------------------------
     Build the AI assistant training script (text)
     ------------------------------------------------------------ */
  function buildAssistantText(d) {
    var a = d.assistant;
    var out = 'AI ASSISTANT \u2014 TRAINING SCRIPT for ' + d.profile.business + '\n';
    out += '==========================================\n\n';
    out += 'NAME: ' + a.name + '\n';
    out += 'WELCOME MESSAGE:\n' + a.welcome + '\n\n';
    out += 'FALLBACK MESSAGE:\n' + a.fallback + '\n\n';
    out += 'WHATSAPP AUTO-REPLY:\n' + a.waReply + '\n\n';
    out += 'KNOWLEDGE (Q&A)\n------------------------------------------\n';
    for (var i = 0; i < a.qa.length; i++) {
      out += 'Q: ' + a.qa[i].q + '\nA: ' + a.qa[i].a + '\n\n';
    }
    return out;
  }

  function buildFullText(d) {
    var out = 'NEXAFLOW AI \u2014 DELIVERY PACK for ' + d.profile.business + '\n';
    out += 'Generated for: ' + d.profile.name + ' (' + d.profile.typeLabel + ', ' + d.profile.city + ')\n';
    out += 'Package: ' + d.profile.package + '\n\n';
    out += '==========================================\n';
    out += '1) WEBSITE COPY\n==========================================\n';
    out += 'META TITLE: ' + d.meta.title + '\n';
    out += 'META DESCRIPTION: ' + d.meta.desc + '\n';
    out += 'SUGGESTED DOMAIN: ' + d.domain + '\n';
    out += 'HERO HEADLINE: ' + d.hero.head + '\n';
    out += 'HERO SUBTEXT: ' + d.hero.sub + '\n\n';
    out += 'ABOUT:\n' + d.about.p1 + '\n\n' + d.about.p2 + '\n\n';
    out += 'SERVICES:\n';
    for (var i = 0; i < d.services.length; i++) { out += '- ' + d.services[i].n + ': ' + d.services[i].d + '\n'; }
    out += '\nWHY US:\n';
    for (var w = 0; w < d.why.length; w++) { out += '- ' + d.why[w] + '\n'; }
    out += '\n==========================================\n2) AI ASSISTANT TRAINING\n==========================================\n\n';
    out += buildAssistantText(d);
    out += '==========================================\n3) CLIENT ONBOARDING\n==========================================\n';
    out += 'WHATSAPP:\n' + d.onboarding.wa + '\n\nEMAIL SUBJECT: ' + d.onboarding.emailSubject + '\nEMAIL BODY:\n' + d.onboarding.emailBody + '\n\n';
    out += '==========================================\n4) 7-DAY DELIVERY PLAN\n==========================================\n';
    for (var p = 0; p < d.plan.length; p++) { out += d.plan[p].day + ': ' + d.plan[p].task + '\n'; }
    return out;
  }

  /* ------------------------------------------------------------
     Optional LLM polish (OpenRouter) — always falls back to the
     built-in engine if no key, offline, or on any error.
     ------------------------------------------------------------ */
  function aiMerge(d, data) {
    if (!data) { return d; }
    if (data.hero_sub) { d.hero.sub = data.hero_sub; }
    if (data.about) { d.about.p1 = data.about; }
    if (data.welcome) { d.assistant.welcome = data.welcome; }
    if (data.wa_reply) { d.assistant.waReply = data.wa_reply; }
    if (data.hero_sub) { d.meta.desc = data.hero_sub.slice(0, 158); }
    return d;
  }

  function generate(input, cb) {
    var d = build(input);
    if (!CONFIG.aiKey) { cb(d, false); return; }
    var typeLabel = (KB[input.type] ? KB[input.type].label : 'business');
    var prompt =
      'Write warm, professional marketing copy for a small local business. ' +
      'Business name: ' + input.business + '. Type: ' + typeLabel + '. City: ' + (input.city || CONFIG.fallbackCity) + '. ' +
      'Services: ' + (input.services || 'typical for this type of business') + '. ' +
      'Return ONLY valid JSON, no markdown, with these keys: ' +
      'hero_sub (one sentence, max 140 chars), ' +
      'about (two friendly sentences), ' +
      'welcome (one short chatbot greeting with a single emoji), ' +
      'wa_reply (one short WhatsApp auto-reply with a single emoji).';
    var body = {
      model: CONFIG.aiModel,
      messages: [
        { role: 'system', content: 'You are a senior copywriter at NexaFlow AI, an agency that builds AI-powered websites for local businesses.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400
    };
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(d, false); } }, 25000);
    try {
      fetch(CONFIG.aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CONFIG.aiKey },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).then(function (json) {
        if (done) { return; }
        done = true; clearTimeout(timer);
        try {
          var content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          var parsed = JSON.parse(content);
          cb(aiMerge(d, parsed), true);
        } catch (e) { cb(d, false); }
      }).catch(function () {
        if (done) { return; }
        done = true; clearTimeout(timer);
        cb(d, false);
      });
    } catch (e) {
      if (done) { return; }
      done = true; clearTimeout(timer);
      cb(d, false);
    }
  }

  /* ------------------------------------------------------------
     Client-side ZIP writer (store method, no compression) so a
     whole client package downloads as ONE .zip — their folder.
     ------------------------------------------------------------ */
  function crc32(bytes) {
    var table = crc32._t;
    if (!table) {
      table = [];
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
        table[n] = c >>> 0;
      }
      crc32._t = table;
    }
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) { crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF]; }
    return (crc ^ -1) >>> 0;
  }

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      // handle surrogate pairs (emoji etc.) -> 4-byte UTF-8
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var d = str.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) {
          var cp = ((c - 0xD800) << 10) + (d - 0xDC00) + 0x10000;
          out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
          i++;
          continue;
        }
      }
      if (c < 0x80) { out.push(c); }
      else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); }
      else { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }

  function zip(files) {
    var u16 = function (v) { return [v & 0xFF, (v >>> 8) & 0xFF]; };
    var u32 = function (v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; };
    var push = function (a, b) { for (var i = 0; i < b.length; i++) { a.push(b[i]); } };
    var out = [];
    var central = [];
    var offset = 0;
    for (var f = 0; f < files.length; f++) {
      var nameBytes = utf8Bytes(files[f].name);
      var dataBytes = utf8Bytes(files[f].data);
      var crc = crc32(dataBytes);
      var size = dataBytes.length;
      var local = [];
      push(local, u32(0x04034b50));
      push(local, u16(20)); push(local, u16(0x0800));
      push(local, u16(0));
      push(local, u16(0)); push(local, u16(0));
      push(local, u32(crc));
      push(local, u32(size)); push(local, u32(size));
      push(local, u16(nameBytes.length)); push(local, u16(0));
      push(local, nameBytes);
      push(out, local);
      push(out, dataBytes);
      var cd = [];
      push(cd, u32(0x02014b50));
      push(cd, u16(20)); push(cd, u16(20));
      push(cd, u16(0x0800)); push(cd, u16(0));
      push(cd, u16(0)); push(cd, u16(0));
      push(cd, u32(crc)); push(cd, u32(size)); push(cd, u32(size));
      push(cd, u16(nameBytes.length)); push(cd, u16(0)); push(cd, u16(0));
      push(cd, u16(0)); push(cd, u16(0)); push(cd, u32(0));
      push(cd, u32(offset));
      push(cd, nameBytes);
      central.push(cd);
      offset += 30 + nameBytes.length + size;
    }
    var cdStart = offset;
    var cdSize = 0;
    for (var c = 0; c < central.length; c++) { push(out, central[c]); cdSize += central[c].length; }
    push(out, u32(0x06054b50));
    push(out, u16(0)); push(out, u16(0));
    push(out, u16(files.length)); push(out, u16(files.length));
    push(out, u32(cdSize)); push(out, u32(cdStart));
    push(out, u16(0));
    try { return new Blob([new Uint8Array(out)], { type: 'application/zip' }); }
    catch (e) { return null; }
  }

  /* ------------------------------------------------------------
     Expose
     ------------------------------------------------------------ */
  window.NexaAI = {
    CONFIG: CONFIG,
    KB: KB,
    build: build,
    generate: generate,
    buildSiteHtml: buildSiteHtml,
    buildAssistantText: buildAssistantText,
    buildFullText: buildFullText,
    zip: zip,
    slug: slugify,
    domainName: domainName,
    esc: esc
  };
})();
