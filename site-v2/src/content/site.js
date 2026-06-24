import menuCache from './menu-cache.json';
import galleryCache from './gallery-cache.json';

export const site = {
  name: 'Brasserie Vivien',
  domain: 'https://vivien.lv',
  address: 'Brivibas iela 37, Riga, LV-1010, Latvia',
  phone: '+371 63 01 30 05',
  phoneHref: '+37163013005',
  email: 'info@vivien.lv',
  restoplaceUrl: 'https://vivien.restoplace.ws/',
  restoplaceWidgetHash: '5a003b0dc90935f47c87',
  a3MenuEndpoint: 'https://app.a3-as.com/api/guest/scheduled-visits/widget/bootstrap',
  a3Merchant: 'vivien-riga',
  prepareTableUrl: 'https://payattable.app/scheduled-visit/widget?merchant=vivien-riga',
  googleReviewUrl: 'https://g.page/r/CeOFF5g6VoU8EBM/review',
  social: [
    'https://www.instagram.com/vivien.brasserie/',
    'https://www.facebook.com/vivien.brasserie'
  ]
};

export const locales = ['en', 'lv', 'fr', 'ru'];

export const localeLabels = {
  en: 'EN',
  lv: 'LV',
  fr: 'FR',
  ru: 'RU'
};

export const languageNames = {
  en: 'English',
  lv: 'Latvian',
  fr: 'French',
  ru: 'Russian'
};

export const content = {
  en: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | French Bistro, Breakfast, Wine & Art',
      homeDescription: 'French brasserie in the heart of Riga with classic brasserie cuisine, curated wines, creative atmosphere, gift cards and one-tap table booking.',
    },
    nav: {
      home: 'Home',
      menu: 'Menu',
      specials: 'Specials',
      gallery: 'Gallery',
      giftCard: 'Gift Card',
      loyalty: 'Loyalty',
      review: 'Review',
      jobs: 'Jobs',
      contact: 'Contact',
      book: 'Book a Table',
    },
    home: {
      heroTitleLead: 'Welcome to',
      heroBrand: 'Brasserie\u00a0Vivien',
      heroText: 'Authentic French cuisine in the heart of Riga',
      menuCta: 'Our Menu',
      bookCta: 'Book a Table',
      prepareTitle: 'Would you like everything to be ready when you arrive?',
      prepareText: 'Or arrange a special evening for someone?',
      prepareCta: 'Prepare the table',
      prepareNote: 'Book a table and pre-order your dishes',
      menuTitle: 'Menu',
      menuSubtitle: 'Classic French cuisine made with fresh ingredients',
      specialsTitle: 'Specials',
      specialsSubtitle: 'Check Our Specials',
      galleryTitle: 'Gallery',
      gallerySubtitle: 'Some photos from our bistro',
      careersTitle: 'We Are Hiring',
      careersSubtitle: 'Become part of the Vivien team',
      contactTitle: 'Contact',
      contactSubtitle: 'Contact Us',
      location: 'Location',
      hours: 'Open Hours',
      hoursText: 'Monday & Friday: 17:00-23:00\nSaturday & Sunday: 12:00-23:00',
      call: 'Call Us',
      email: 'Email Us',
    },
    form: {
      loading: 'Sending',
      success: 'Thank you. Your request has been sent.',
      error: 'Submission failed. Please try again or contact us by phone.',
      serverUnavailable: 'Email delivery is not available in this preview. Please try again later or contact us by phone.',
      name: 'Your name',
      email: 'Your email',
      phone: 'Your phone number',
      subject: 'Subject',
      message: 'Message',
      send: 'Send',
      consent: 'I agree to the processing of my personal data for this request.',
    },
    gift: {
      title: 'Gift Card Vivien',
      titleLead: 'Gift Card',
      titleBrand: 'Vivien',
      description: 'Format: Apple / Google Wallet. Amount — from 10 € to 500 €. The card is sent at your chosen time or right after payment.',
      formatLabel: 'Format:',
      amountPrefix: 'Amount — from',
      amountTo: 'to',
      deliveryLine: 'The card is sent at your chosen time or right after payment.',
      benefitLead: 'The Gift Card pays your bill up to the deposited amount. As a Vivien Friends Club card, it also offers:',
      benefits: [
        'adds 10% of each purchase;',
        'this bonus can cover up to 50% of the next bill;',
        "invites you to Vivien's special events.",
      ],
      formTitle: 'Gift Card Application',
      amount: 'Amount, EUR',
      deliveryAt: 'Preferred delivery date',
      payerEmail: 'Payer email',
      payerNote: 'Note for our team',
      recipientName: 'Recipient name',
      recipientEmail: 'Recipient email',
      recipientPhone: 'Recipient phone',
      recipientMessage: 'Message to recipient',
      submit: 'Request Gift Card',
      thanksTitle: 'Thank you',
      thanksText: 'We have received your gift card request and will contact you with payment and delivery details.',
    },
    review: {
      title: 'Tell us how we did',
      titleLead: 'Tell us',
      titleHighlight: 'how we did',
      description: 'If your visit was delightful, a quick review helps other guests discover us. If something could be better, tell us privately — we’ll fix it fast.',
      heroLines: [
        '⭐ If your visit was delightful, a quick review helps other guests discover us.',
        '🛠 If something could be better, tell us privately — we’ll fix it fast.',
      ],
      visitorQuestion: 'Have you been here before?',
      firstTime: 'First time ✨',
      returning: 'Been here before ❤️',
      sourceFirst: 'Where did you find us?',
      sourceReturning: 'What brought you back?',
      sourceHint: 'Just tap one — it takes a second 💡',
      sources: ['Instagram', 'Facebook', 'TikTok', 'Google / Maps', 'TripAdvisor', 'Vivien.lv', 'Online ad', 'Friends', 'Passing by', 'Magazine / Newspaper ad'],
      positive: 'Loved it!  ★★★★★',
      negative: 'Improve',
      privateTitle: 'Tell Us How We Can Improve',
      message: 'What could we improve?',
      submit: 'Send privately',
      languageName: 'English',
    },
    loyalty: {
      title: 'Vivien Friends Club',
      description: 'Register for a Vivien loyalty card and receive your membership card for Apple or Google Wallet after review.',
      people: 'Family size',
      gender: 'Gender',
      birthdate: 'Birthdate',
      profession: 'Profession',
      source: 'Referral or event where you received our invitation',
      interests: 'A few words about your interests',
      submit: 'Register',
    },
    jobs: {
      waiterTitle: 'Waiter / Waitress at Brasserie Vivien',
      maitreTitle: 'Maître d’hôtel at Brasserie Vivien',
      intro: 'Brasserie Vivien is a vibrant French bistro in the heart of Riga, where classic hospitality meets contemporary rhythm.',
      apply: 'Apply now',
      cover: 'Short cover letter',
      position: 'Position',
      attachment: 'CV or portfolio',
      submit: 'Send application',
      waiter: {
        titleLead: 'Waiter / Waitress at',
        titleBrand: 'Brasserie\u00a0Vivien',
        description: 'Brasserie Vivien is a vibrant French bistro in the heart of Riga, where classic hospitality meets contemporary rhythm.',
        location: '📍 Rīga, Latvia',
        schedule: '⏰ Full-time or part-time',
        languages: '🗣 Latvian, English and Russian required, French is a strong plus',
        aboutTitle: 'About the job',
        introHtml: '<strong>Brasserie Vivien</strong> is a vibrant French bistro in the heart of Riga, where classic hospitality meets contemporary rhythm. We’re looking for a warm, attentive and confident <strong>Waiter/Waitress</strong> who can make every guest feel like a regular, and every moment feel personal.',
        sections: [
          {
            title: '💼 Your responsibilities:',
            items: [
              'Welcome guests with grace and attentiveness',
              'Present the menu and share stories behind the food and wines',
              'Guide guests through the ordering process and offer recommendations',
              'Coordinate closely with the kitchen and bar to ensure timely service',
              'Maintain table settings, cleanliness, and atmosphere',
              'Handle bills and payments accurately and discreetly',
              'Support colleagues and contribute to a positive team culture',
            ],
          },
          {
            title: '✅ What we’re looking for:',
            items: [
              'Previous experience in restaurant service is preferred, but not essential',
              'Positive energy, emotional intelligence, and strong communication skills',
              'Fluency in Latvian, English, and Russian; French is a strong plus',
              'Genuine interest in food, wine, and guest interaction',
              'Reliability, neat appearance, and a good sense of rhythm during service',
              'Willingness to learn and grow in a dynamic hospitality setting',
            ],
          },
          {
            title: '🌟 What we offer:',
            items: [
              'Competitive hourly pay + service charge/tips',
              'Flexible schedule and respectful team environment',
              'Daily staff meals and employee perks',
              'Training and opportunities for growth within the restaurant',
              'Invitations to tastings, events, and cultural evenings',
            ],
          },
          {
            title: 'ℹ️ Mandatory notice (per Latvian Labour Law, Article 32):',
            items: [
              '<strong>Employer:</strong> SIA “Brīvības 37”, reg. No. 40203632383',
              '<strong>Salary:</strong> €7.00–€10.00 gross per hour + tips',
              '<strong>Language requirement:</strong> Latvian, English and Russian are required due to guest service needs; French is a plus',
            ],
          },
        ],
        applyIntroHtml: 'If you have <strong>a passion for people, precision, and Parisian flair</strong> — we’d love to meet you.',
        positionValue: 'Waiter/Waitress',
      },
      maitre: {
        titleLead: 'Maître d’hôtel at',
        titleBrand: 'Brasserie\u00a0Vivien',
        description: 'Brasserie Vivien is a vibrant French bistro in the heart of Riga, where classic hospitality meets contemporary rhythm.',
        location: '📍 Rīga, Latvia',
        schedule: '⏰ Full-time',
        languages: '🗣 Latvian, English and Russian required, French is a strong plus',
        aboutTitle: 'About the job',
        introHtml: '<strong>Brasserie Vivien</strong> is a vibrant French bistro in the heart of Riga, where classic hospitality meets contemporary rhythm. We’re looking for a charismatic, highly organized <strong>Maître d’hôtel</strong> to lead the front-of-house team, orchestrate a smooth guest experience, and embody the spirit of our house with elegance and precision.',
        sections: [
          {
            title: '💼 Your responsibilities:',
            items: [
              'Represent the brasserie with presence, warmth, and professionalism',
              'Manage reservations and floor planning (indoor dining room and outdoor courtyard)',
              'Greet and seat guests with flair, attention to detail, and anticipation of needs',
              'Supervise the front-of-house team: briefings, appearance, discipline, guest service',
              'Resolve service issues gracefully and ensure seamless communication with the kitchen',
              'Maintain high standards of cleanliness, order, and ambiance throughout service',
              'Assist in VIP guest handling, private events, and daily sales reporting',
            ],
          },
          {
            title: '✅ What we’re looking for:',
            items: [
              'Proven experience in hospitality or fine dining (3+ years preferred)',
              'Strong leadership and team management skills',
              'Confidence and charm in communication, both with guests and staff',
              'Fluency in Latvian, English, and Russian; French is a strong plus',
              'Knowledge of reservation systems, POS tools, and service protocols',
              'Impeccable personal presentation and time management',
            ],
          },
          {
            title: '🌟 What we offer:',
            items: [
              'Competitive salary with performance-based bonuses',
              'A creative, supportive working environment in a growing hospitality brand',
              'Opportunities to lead special projects and co-create guest experiences',
              'Staff meals, wellness perks, and invitations to cultural events',
              'Real career growth as part of an ambitious, expanding concept',
            ],
          },
          {
            title: 'ℹ️ Mandatory notice (per Latvian Labour Law, Article 32):',
            items: [
              '<strong>Employer:</strong> SIA “Brīvības 37”, reg. No. 40203632383',
              '<strong>Salary:</strong> €8.00–€10.50 gross per hour + tips',
              '<strong>Language requirement:</strong> Latvian, English and Russian are required due to guest service needs; French is a plus',
            ],
          },
        ],
        applyIntroHtml: 'If you have <strong>a passion for people, precision, and Parisian flair</strong> — we’d love to meet you.',
        positionValue: 'Maître d’hôtel',
      },
    },
    legalFallback: 'Juridiskais dokuments ir publicēts latviešu valodā, izmantojot Restoplace avota momentuzņēmumu.',
  },
  lv: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Franču bistro, brokastis, vīns un māksla',
      homeDescription: 'Franču brasserie Rīgas centrā ar klasisku virtuvi, rūpīgi atlasītiem vīniem, dāvanu kartēm un ērtu galdiņa rezervāciju.',
    },
    nav: {
      home: 'Sākums',
      menu: 'Ēdienkarte',
      specials: 'Īpašie piedāvājumi',
      gallery: 'Galerija',
      giftCard: 'Dāvanu karte',
      loyalty: 'Lojalitāte',
      review: 'Atsauksme',
      jobs: 'Darbs',
      contact: 'Kontakti',
      book: 'Rezervēt',
    },
    home: {
      heroTitleLead: 'Laipni lūgti',
      heroBrand: 'Brasserie\u00a0Vivien',
      heroText: 'Autentiska franču virtuve Rīgas sirdī',
      menuCta: 'Mūsu Ēdienkarte',
      bookCta: 'Rezervēt Galiņu',
      prepareTitle: 'Vai vēlaties, lai viss būtu gatavs jūsu ierašanās brīdī?',
      prepareText: 'Vai sarīkot kādam īpašu vakaru?',
      prepareCta: 'Sagatavot galdu',
      prepareNote: 'Rezervējiet galdu un izvēlieties ēdienus iepriekš',
      menuTitle: 'Ēdienkarte',
      menuSubtitle: 'Klasiska franču virtuve no svaigām sastāvdaļām',
      specialsTitle: 'Īpašie piedāvājumi',
      specialsSubtitle: 'Šefpavāra ieteikumi',
      galleryTitle: 'Galerija',
      gallerySubtitle: 'Dažas fotogrāfijas no mūsu bistro',
      careersTitle: 'Mēs meklējam kolēģus',
      careersSubtitle: 'Kļūstiet par Vivien komandas daļu',
      contactTitle: 'Kontakti',
      contactSubtitle: 'Sazinieties ar mums',
      location: 'Adrese',
      hours: 'Darba laiks',
      hoursText: 'Pirmdien un piektdien: 17:00-23:00\nSestdien un svētdien: 12:00-23:00',
      call: 'Tālrunis',
      email: 'E-pasts',
    },
    form: {
      loading: 'Nosūtām',
      success: 'Paldies. Jūsu pieprasījums ir nosūtīts.',
      error: 'Nosūtīšana neizdevās. Lūdzu, mēģiniet vēlreiz vai sazinieties pa tālruni.',
      serverUnavailable: 'Šajā priekšskatījumā e-pasta nosūtīšana nav pieejama. Lūdzu, mēģiniet vēlāk vai sazinieties pa tālruni.',
      name: 'Jūsu vārds',
      email: 'Jūsu e-pasts',
      phone: 'Jūsu tālrunis',
      subject: 'Temats',
      message: 'Ziņa',
      send: 'Nosūtīt',
      consent: 'Piekrītu manu personas datu apstrādei šī pieprasījuma vajadzībām.',
    },
    gift: {
      title: 'Dāvanu karte Vivien',
      titleLead: 'Dāvanu karte',
      titleBrand: 'Vivien',
      description: 'Formāts: Apple / Google Wallet. Summa — no 10 € līdz 500 €. Karte tiek nosūtīta Jūsu izvēlētajā laikā vai tūlīt pēc apmaksas.',
      formatLabel: 'Formāts:',
      amountPrefix: 'Summa — no',
      amountTo: 'līdz',
      deliveryLine: 'Karte tiek nosūtīta Jūsu izvēlētajā laikā vai tūlīt pēc apmaksas.',
      benefitLead: 'Dāvanu karte sedz rēķinu noteiktās summas ietvaros. Kā arī Vivien Draugu Kluba Karte nodrošina:',
      benefits: [
        '10% uzkrājumu no katra pirkuma;',
        'ar šiem bonusiem var apmaksāt līdz 50% no nākamā rēķina;',
        'ielūgumu uz īpašiem Vivien vakariem.',
      ],
      formTitle: 'Pieteikums dāvanu kartei',
      amount: 'Summa, EUR',
      deliveryAt: 'Vēlamais piegādes datums',
      payerEmail: 'Maksātāja e-pasts',
      payerNote: 'Piezīme komandai',
      recipientName: 'Saņēmēja vārds',
      recipientEmail: 'Saņēmēja e-pasts',
      recipientPhone: 'Saņēmēja tālrunis',
      recipientMessage: 'Ziņa saņēmējam',
      submit: 'Pieteikt dāvanu karti',
      thanksTitle: 'Paldies',
      thanksText: 'Esam saņēmuši Jūsu dāvanu kartes pieteikumu un sazināsimies par apmaksu un piegādi.',
    },
    review: {
      title: 'Pastāstiet kā mums veicās',
      titleLead: 'Pastāstiet',
      titleHighlight: 'kā mums veicās',
      description: 'Ja esat apmierināts ar savu pieredzi Bistro Vivien, padalieties ar savu atsauksmi, lai arī citi par mums uzzin. Ja domājat, ka mēs kaut ko varētu uzlabot, lūdzu, paziņojiet mums to privāti.',
      heroLines: [
        '⭐ Ja esat apmierināts ar savu pieredzi Bistro Vivien, padalieties ar savu atsauksmi, lai arī citi par mums uzzin!',
        '🛠 Ja domājat, ka mēs kaut ko varētu uzlabot, lūdzu, paziņojiet mums to privāti, lai mēs pēc iespējas ātrāk varētu to izlabot!',
      ],
      visitorQuestion: 'Vai šis ir jūsu pirmais apmeklējums pie mums?',
      firstTime: 'Pirmo reizi ✨',
      returning: 'Esmu bijis iepriekš ❤️',
      sourceFirst: 'Kā jūs mūs atradāt?',
      sourceReturning: 'Kāpēc atnācāt atkal?',
      sourceHint: 'Vienkārši pieskarieties vienam 💡',
      sources: ['Instagram', 'Facebook', 'TikTok', 'Google / Maps', 'TripAdvisor', 'Vivien.lv', 'Reklāma tiešsaistē', 'Draugu ieteikums', 'Gāju / braucu garām', 'Žurnāls / avīze'],
      positive: 'Patika!  ★★★★★',
      negative: 'Varētu būt labāk',
      privateTitle: 'Kā kļūt labākiem',
      message: 'Ko mēs varētu uzlabot?',
      submit: 'Nosūtīt privāti',
      languageName: 'Latviešu',
    },
    loyalty: {
      title: 'Vivien Friends Club',
      description: 'Reģistrējieties Vivien lojalitātes kartei un pēc pārbaudes saņemiet karti Apple vai Google Wallet.',
      people: 'Ģimenes locekļu skaits',
      gender: 'Dzimums',
      birthdate: 'Dzimšanas datums',
      profession: 'Profesija',
      source: 'Ieteikums vai pasākums, kur saņēmāt uzaicinājumu',
      interests: 'Daži vārdi par Jūsu interesēm',
      submit: 'Reģistrēties',
    },
    jobs: {
      waiterTitle: 'Viesmīlis / Viesmīle Brasserie Vivien',
      maitreTitle: 'Maitre d’hotel Brasserie Vivien',
      intro: 'Brasserie Vivien ir dzīvīgs franču bistro Rīgas centrā, kur klasiska viesmīlība satiekas ar mūsdienīgu ritmu.',
      apply: 'Pieteikties',
      cover: 'Īsa motivācijas vēstule',
      position: 'Amats',
      attachment: 'CV vai portfolio',
      submit: 'Nosūtīt pieteikumu',
      waiter: {
        titleLead: 'Viesmīlis / Viesmīle',
        titleBrand: 'Brasserie\u00a0Vivien',
        description: 'Brasserie Vivien ir dzīvīgs franču bistro Rīgas centrā, kur klasiska viesmīlība satiekas ar mūsdienīgu ritmu.',
        location: '📍 Rīga, Latvija',
        schedule: '⏰ Pilna vai nepilna slodze',
        languages: '🗣 Latviešu, angļu un krievu valoda obligāta, franču — liela priekšrocība',
        aboutTitle: 'Par darbu',
        introHtml: '<strong>Brasserie Vivien</strong> ir dzīvīgs franču bistro Rīgas centrā, kur klasiska viesmīlība satiekas ar mūsdienīgu ritmu. Mēs meklējam sirsnīgu, uzmanīgu un pārliecinātu <strong>viesmīli</strong>, kurš spēj padarīt katru viesi par pastāvīgo, bet katru mirkli — īpašu.',
        sections: [
          {
            title: '💼 Tavs pienākums:',
            items: [
              'Sagaidīt viesus ar smaidu un uzmanību',
              'Prezentēt ēdienkarti un pastāstīt par ēdieniem un vīniem',
              'Palīdzēt viesiem izvēlēties un sniegt ieteikumus',
              'Sadarboties ar virtuvi un bāru, lai nodrošinātu ātru apkalpošanu',
              'Uzturēt galdu kārtību, tīrību un noskaņu',
              'Precīzi un diskrēti apstrādāt rēķinus un maksājumus',
              'Atbalstīt kolēģus un veidot pozitīvu komandas garu',
            ],
          },
          {
            title: '✅ Ko mēs meklējam:',
            items: [
              'Iepriekšēja pieredze viesmīlībā ir vēlams, bet nav obligāta',
              'Pozitīva enerģija, emocionālais intelekts un komunikācijas prasmes',
              'Brīva latviešu, angļu un krievu valodas prasme; franču valoda — priekšrocība',
              'Interese par ēdienu, vīnu un viesu apkalpošanu',
              'Uzticamība, kārtīgs izskats un ritma izjūta darbā',
              'Vēlme mācīties un attīstīties dinamiskā vidē',
            ],
          },
          {
            title: '🌟 Mēs piedāvājam:',
            items: [
              'Konkurētspējīgu stundas likmi + dzeramnaudu / servisa piemaksu',
              'Elastīgu darba grafiku un cieņpilnu komandas atmosfēru',
              'Darbinieku maltītes katru dienu un citas priekšrocības',
              'Apmācības un izaugsmes iespējas uzņēmumā',
              'Ielūgumus uz degustācijām, pasākumiem un kultūras vakariem',
            ],
          },
          {
            title: 'ℹ️ Obligātā informācija (saskaņā ar Latvijas Darba likuma 32. pantu):',
            items: [
              '<strong>Darba devējs:</strong> SIA “Brīvības 37”, reģ. Nr. 40203632383',
              '<strong>Atalgojums:</strong> €7.00–€10.00 bruto stundā + dzeramnauda',
              '<strong>Valodu prasības:</strong> Nepieciešama latviešu, angļu un krievu valoda; franču — priekšrocība',
            ],
          },
        ],
        applyIntroHtml: '<strong>Ja Tev ir aizrautība ar cilvēkiem, precizitāti un Parīzes šarmu</strong>, mēs vēlamies Tevi iepazīt.',
        positionValue: 'Viesmīlis/Viesmīle',
      },
    },
    legalFallback: 'Juridiskais dokuments ir publicēts latviešu valodā, izmantojot Restoplace avota momentuzņēmumu.',
  },
  fr: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Bistro français, petit-déjeuner, vin et art',
      homeDescription: 'Brasserie française au centre de Riga avec cuisine classique, vins sélectionnés, cartes cadeaux et réservation de table en un clic.',
    },
    nav: {
      home: 'Accueil',
      menu: 'Carte',
      specials: 'Suggestions du chef',
      gallery: 'Galerie',
      giftCard: 'Carte Cadeau',
      loyalty: 'Fidélité',
      review: 'Avis',
      jobs: 'Emplois',
      contact: 'Contact',
      book: 'Réservation',
    },
    home: {
      heroTitleLead: 'Bienvenue à la',
      heroBrand: 'Brasserie\u00a0Vivien',
      heroText: 'Cuisine française authentique au cœur de Riga',
      menuCta: 'Notre Menu',
      bookCta: 'Réserver une table',
      prepareTitle: 'Souhaitez-vous que tout soit prêt à votre arrivée ?',
      prepareText: 'Ou offrir à quelqu’un une soirée spéciale ?',
      prepareCta: 'Préparer la table',
      prepareNote: 'Réservez votre table et choisissez vos plats à l’avance',
      menuTitle: 'Carte',
      menuSubtitle: 'Cuisine française classique élaborée à partir d\'ingrédients frais',
      specialsTitle: 'Nos Spécialités',
      specialsSubtitle: 'Notre chef recommande',
      galleryTitle: 'Galerie',
      gallerySubtitle: 'Quelques photos de notre bistrot',
      careersTitle: 'Nous recrutons',
      careersSubtitle: 'Rejoignez l’équipe Vivien',
      contactTitle: 'Contact',
      contactSubtitle: 'Contactez-nous',
      location: 'Adresse',
      hours: 'Horaires',
      hoursText: 'Lundi et vendredi : 17:00-23:00\nSamedi et dimanche : 12:00-23:00',
      call: 'Téléphone',
      email: 'E-mail',
    },
    form: {
      loading: 'Envoi',
      success: 'Merci. Votre demande a été envoyée.',
      error: 'L’envoi a échoué. Réessayez ou contactez-nous par téléphone.',
      serverUnavailable: 'L’envoi d’e-mail n’est pas disponible dans cet aperçu. Réessayez plus tard ou contactez-nous par téléphone.',
      name: 'Votre nom',
      email: 'Votre e-mail',
      phone: 'Votre téléphone',
      subject: 'Sujet',
      message: 'Message',
      send: 'Envoyer',
      consent: 'J’accepte le traitement de mes données personnelles pour cette demande.',
    },
    gift: {
      title: 'Carte cadeau Vivien',
      titleLead: 'Carte cadeau',
      titleBrand: 'Vivien',
      description: 'Format : Apple / Google Wallet. Montant — de 10 € à 500 €. La carte sera envoyée au destinataire immédiatement après le paiement ou à l’heure que vous aurez choisie.',
      formatLabel: 'Format :',
      amountPrefix: 'Montant — de',
      amountTo: 'à',
      deliveryLine: 'La carte sera envoyée au destinataire immédiatement après le paiement ou à l’heure que vous aurez choisie.',
      benefitLead: 'La carte cadeau règle l’addition jusqu’au montant crédité. En tant que carte du Club des Amis Vivien, elle offre aussi :',
      benefits: [
        '10% de chaque achat sont crédités ;',
        'ces bonus peuvent couvrir jusqu’à 50% de la prochaine addition ;',
        'des invitations aux événements spéciaux Vivien.',
      ],
      formTitle: 'Demande de carte cadeau',
      amount: 'Montant, EUR',
      deliveryAt: 'Date de livraison souhaitée',
      payerEmail: 'E-mail du payeur',
      payerNote: 'Note pour notre équipe',
      recipientName: 'Nom du bénéficiaire',
      recipientEmail: 'E-mail du bénéficiaire',
      recipientPhone: 'Téléphone du bénéficiaire',
      recipientMessage: 'Message au bénéficiaire',
      submit: 'Demander la carte cadeau',
      thanksTitle: 'Merci',
      thanksText: 'Nous avons reçu votre demande de carte cadeau et vous contacterons pour le paiement et la livraison.',
    },
    review: {
      title: 'Donnez-nous votre avis',
      titleLead: 'Donnez-nous',
      titleHighlight: 'votre avis',
      description: 'Si votre visite vous a plu, un avis rapide aidera d’autres clients à nous découvrir. Si quelque chose peut être amélioré, dites-le-nous en privé.',
      heroLines: [
        '⭐ Si votre visite vous a plu, un avis rapide aidera d’autres clients à nous découvrir.',
        '🛠 Si quelque chose peut être amélioré, dites-le-nous en privé — nous y remédierons rapidement.',
      ],
      visitorQuestion: 'C’est votre première visite ?',
      firstTime: 'Première fois ✨',
      returning: 'Déjà venu ❤️',
      sourceFirst: 'Comment nous avez-vous découverts ?',
      sourceReturning: 'Qu’est-ce qui vous a fait revenir ?',
      sourceHint: 'Touchez une option — 1 seconde 💡',
      sources: ['Instagram', 'Facebook', 'TikTok', 'Google / Maps', 'TripAdvisor', 'Vivien.lv', 'Pub en ligne', 'Amis', 'En passant', 'Magazine / presse'],
      positive: 'J’ai aimé !  ★★★★★',
      negative: 'À améliorer',
      privateTitle: 'Comment s’améliorer',
      message: 'Ko mēs varētu uzlabot?',
      submit: 'Envoyer en privé',
      languageName: 'Français',
    },
    loyalty: {
      title: 'Vivien Friends Club',
      description: 'Inscrivez-vous à la carte de fidélité Vivien et recevez votre carte Apple ou Google Wallet après validation.',
      people: 'Taille de la famille',
      gender: 'Genre',
      birthdate: 'Date de naissance',
      profession: 'Profession',
      source: 'Recommandation ou événement où vous avez reçu notre invitation',
      interests: 'Quelques mots sur vos intérêts',
      submit: 'S’inscrire',
    },
    jobs: {
      waiterTitle: 'Serveur / Serveuse chez Brasserie Vivien',
      maitreTitle: 'Maitre d’hotel chez Brasserie Vivien',
      intro: 'Brasserie Vivien est un bistrot français chaleureux situé au cœur de Riga, où l’hospitalité classique rencontre le rythme contemporain.',
      apply: 'Postuler',
      cover: 'Courte lettre de motivation',
      position: 'Poste',
      attachment: 'CV ou portfolio',
      submit: 'Envoyer la candidature',
      waiter: {
        titleLead: 'Serveur / Serveuse chez',
        titleBrand: 'Brasserie\u00a0Vivien',
        description: 'Brasserie Vivien est un bistrot français chaleureux situé au cœur de Riga, où l’hospitalité classique rencontre le rythme contemporain.',
        location: '📍 Riga, Lettonie',
        schedule: '⏰ Temps plein ou partiel',
        languages: '🗣 Letton, anglais et russe requis, le français est un atout',
        aboutTitle: 'À propos du poste',
        introHtml: '<strong>Brasserie Vivien</strong> est un bistrot français chaleureux situé au cœur de Riga, où l’hospitalité classique rencontre le rythme contemporain. Nous recherchons un(e) <strong>serveur / serveuse</strong> attentionné(e), accueillant(e) et sûr(e) de lui/elle, capable de faire de chaque invité un habitué, et de chaque moment une expérience personnelle.',
        sections: [
          {
            title: '💼 Vos missions :',
            items: [
              'Accueillir les clients avec élégance et bienveillance',
              'Présenter le menu et raconter l’histoire des plats et des vins',
              'Guider les invités dans leurs choix et faire des recommandations',
              'Collaborer avec la cuisine et le bar pour un service fluide',
              'Maintenir l’ordre, la propreté et l’ambiance de la salle',
              'Gérer les paiements avec discrétion et précision',
              'Soutenir vos collègues et contribuer à une bonne ambiance d’équipe',
            ],
          },
          {
            title: '✅ Profil recherché :',
            items: [
              'Une première expérience en restauration est souhaitée, mais pas obligatoire',
              'Énergie positive, intelligence émotionnelle et aisance relationnelle',
              'Maîtrise du letton, de l’anglais et du russe; le français est un atout',
              'Intérêt sincère pour la cuisine, le vin et les échanges avec les clients',
              'Fiabilité, apparence soignée et sens du rythme pendant le service',
              'Volonté d’apprendre et de grandir dans un environnement dynamique',
            ],
          },
          {
            title: '🌟 Ce que nous offrons :',
            items: [
              'Salaire horaire compétitif + pourboires / frais de service',
              'Horaires flexibles et ambiance d’équipe respectueuse',
              'Repas du personnel chaque jour et avantages employés',
              'Formation et perspectives d’évolution au sein du restaurant',
              'Invitations à des dégustations, événements et soirées culturelles',
            ],
          },
          {
            title: 'ℹ️ Informations obligatoires (conformément à l’article 32 du Code du travail letton) :',
            items: [
              '<strong>Employeur :</strong> SIA “Brīvības 37”, n° d’enregistrement 40203632383',
              '<strong>Salaire :</strong> 7,00 € – 10,00 € brut / heure + pourboires',
              '<strong>Langues requises :</strong> letton, anglais et russe; le français est un atout',
            ],
          },
        ],
        applyIntroHtml: 'Si vous avez <strong>le sens de l’humain, de la précision et du charme à la française</strong>, nous serions ravis de vous rencontrer.',
        positionValue: 'Serveur / Serveuse',
      },
    },
    legalFallback: 'Juridiskais dokuments ir publicēts latviešu valodā, izmantojot Restoplace avota momentuzņēmumu.',
  },
  ru: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Французское бистро, завтраки, вино и искусство',
      homeDescription: 'Французская brasserie в центре Риги с классической кухней, винами, подарочными картами и бронированием столика в одно касание.',
    },
    nav: {
      home: 'Домой',
      menu: 'Меню',
      specials: 'Фирменные блюда',
      gallery: 'Галерея',
      giftCard: 'Подарочная карта',
      loyalty: 'Лояльность',
      review: 'Отзыв',
      jobs: 'Вакансии',
      contact: 'Контакты',
      book: 'Бронировать',
    },
    home: {
      heroTitleLead: 'Добро пожаловать в',
      heroBrand: 'Brasserie\u00a0Vivien',
      heroText: 'Аутентичная французская кухня в сердце Риги',
      menuCta: 'Наше Меню',
      bookCta: 'Бронировать',
      prepareTitle: 'Хотите, чтобы всё было готово к вашему приходу?',
      prepareText: 'Или устроить кому-то особенный вечер?',
      prepareCta: 'Подготовить стол',
      prepareNote: 'Забронируйте стол и выберите блюда заранее',
      menuTitle: 'Меню',
      menuSubtitle: 'Классическая французская кухня из свежих ингредиентов',
      specialsTitle: 'Наши специальные блюда',
      specialsSubtitle: 'Шеф-повар рекомендует',
      galleryTitle: 'Галерея',
      gallerySubtitle: 'Некоторые фото из нашего бистро',
      careersTitle: 'Мы ищем коллег',
      careersSubtitle: 'Станьте частью команды Vivien',
      contactTitle: 'Контакты',
      contactSubtitle: 'Мы будем рады вашим отзывам',
      location: 'Адрес',
      hours: 'Часы работы',
      hoursText: 'Понедельник и пятница: 17:00-23:00\nСуббота и воскресенье: 12:00-23:00',
      call: 'Телефон',
      email: 'Эл. почта',
    },
    form: {
      loading: 'Отправляем',
      success: 'Спасибо. Ваш запрос отправлен.',
      error: 'Не удалось отправить форму. Попробуйте ещё раз или свяжитесь с нами по телефону.',
      serverUnavailable: 'Отправка email недоступна в этом preview. Попробуйте позже или свяжитесь с нами по телефону.',
      name: 'Ваше имя',
      email: 'Ваш email',
      phone: 'Ваш телефон',
      subject: 'Тема',
      message: 'Сообщение',
      send: 'Отправить',
      consent: 'Я согласен(на) на обработку персональных данных для этого запроса.',
    },
    gift: {
      title: 'Подарочная карта Vivien',
      titleLead: 'Подарочная карта',
      titleBrand: 'Vivien',
      description: 'Формат: Apple / Google Wallet. Номинал — от 10 € до 500 €. Карта отправляется в выбранное вами время или сразу после оплаты.',
      formatLabel: 'Формат:',
      amountPrefix: 'Номинал — от',
      amountTo: 'до',
      deliveryLine: 'Карта отправляется в выбранное вами время или сразу после оплаты.',
      benefitLead: 'Подарочная карта оплачивает счёт в пределах внесённой суммы. Это — Карта Клуба Друзей Vivien, по ней также:',
      benefits: [
        'начисляется 10% от каждой покупки;',
        'этими бонусами можно оплатить до 50% следующего счёта;',
        'мы приглашаем на специальные события Vivien.',
      ],
      formTitle: 'Заявка на подарочную карту',
      amount: 'Сумма, EUR',
      deliveryAt: 'Желаемая дата доставки',
      payerEmail: 'Email плательщика',
      payerNote: 'Комментарий для команды',
      recipientName: 'Имя получателя',
      recipientEmail: 'Email получателя',
      recipientPhone: 'Телефон получателя',
      recipientMessage: 'Сообщение получателю',
      submit: 'Заказать подарочную карту',
      thanksTitle: 'Спасибо',
      thanksText: 'Мы получили заявку на подарочную карту и свяжемся с вами по оплате и доставке.',
    },
    review: {
      title: 'Расскажите, как мы справились',
      titleLead: 'Расскажите,',
      titleHighlight: 'как мы справились',
      description: 'Если ваш визит был приятным, короткий отзыв поможет другим гостям узнать о нас. Если что-то можно улучшить, расскажите нам лично.',
      heroLines: [
        '⭐ Если ваш визит был приятным, короткий отзыв поможет другим гостям узнать о нас.',
        '🛠 Если что-то можно улучшить, расскажите нам лично — мы быстро всё исправим.',
      ],
      visitorQuestion: 'Вы у нас впервые?',
      firstTime: 'Впервые ✨',
      returning: 'Уже бывал ❤️',
      sourceFirst: 'Где вы о нас узнали?',
      sourceReturning: 'Почему пришли снова?',
      sourceHint: 'Нажмите один вариант — это секунда 💡',
      sources: ['Instagram', 'Facebook', 'TikTok', 'Google / Maps', 'TripAdvisor', 'Vivien.lv', 'Реклама онлайн', 'Совет друзей', 'Мимо проходил', 'Журнал / газета'],
      positive: 'Понравилось!  ★★★★★',
      negative: 'Улучшить',
      privateTitle: 'Как нам стать лучше',
      message: 'Что мы могли бы улучшить?',
      submit: 'Отправить лично',
      languageName: 'Русский',
    },
    loyalty: {
      title: 'Vivien Friends Club',
      description: 'Зарегистрируйтесь для карты лояльности Vivien и после проверки получите карту для Apple или Google Wallet.',
      people: 'Размер семьи',
      gender: 'Пол',
      birthdate: 'Дата рождения',
      profession: 'Профессия',
      source: 'Рекомендация или событие, где вы получили приглашение',
      interests: 'Несколько слов о ваших интересах',
      submit: 'Зарегистрироваться',
    },
    jobs: {
      waiterTitle: 'Официант / Официантка в Brasserie Vivien',
      maitreTitle: 'Метрдотель в Brasserie Vivien',
      intro: 'Brasserie Vivien — это уютное французское бистро в самом сердце Риги, где классическое гостеприимство сочетается с живым современным ритмом.',
      apply: 'Откликнуться',
      cover: 'Короткое сопроводительное письмо',
      position: 'Позиция',
      attachment: 'CV или портфолио',
      submit: 'Отправить отклик',
      waiter: {
        titleLead: 'Официант / Официантка в',
        titleBrand: 'Brasserie\u00a0Vivien',
        description: 'Brasserie Vivien — это уютное французское бистро в самом сердце Риги, где классическое гостеприимство сочетается с живым современным ритмом.',
        location: '📍 Рига, Латвия',
        schedule: '⏰ Полная или частичная занятость',
        languages: '🗣 Обязательны латышский, английский и русский. Французский — большой плюс',
        aboutTitle: 'О вакансии',
        introHtml: '<strong>Brasserie Vivien</strong> — это уютное французское бистро в самом сердце Риги, где классическое гостеприимство сочетается с живым современным ритмом. Мы ищем внимательного, доброжелательного и уверенного <strong>официанта</strong>, способного превратить каждый визит в особенное впечатление.',
        sections: [
          {
            title: '💼 Ваши обязанности:',
            items: [
              'Приветствовать гостей с вниманием и заботой',
              'Презентовать меню и рассказывать истории о блюдах и винах',
              'Помогать с выбором блюд, давать рекомендации',
              'Координировать работу с кухней и баром для своевременной подачи',
              'Следить за чистотой, сервировкой и атмосферой в зале',
              'Точно и деликатно оформлять счёт и расчёты',
              'Поддерживать коллег и вносить вклад в позитивную атмосферу в команде',
            ],
          },
          {
            title: '✅ Мы ищем:',
            items: [
              'Опыт в сфере ресторанного сервиса желателен, но не обязателен',
              'Позитивная энергия, эмоциональный интеллект, хорошие коммуникативные навыки',
              'Свободное владение латышским, английским и русским; французский — большое преимущество',
              'Интерес к гастрономии, вину и общению с гостями',
              'Надёжность, опрятный внешний вид и хорошее чувство ритма в обслуживании',
              'Готовность учиться и развиваться в сфере гостеприимства',
            ],
          },
          {
            title: '🌟 Мы предлагаем:',
            items: [
              'Конкурентоспособную почасовую оплату + чаевые',
              'Гибкий график и уважительное отношение в коллективе',
              'Ежедневное питание и внутренние бонусы',
              'Обучение и возможности профессионального роста',
              'Приглашения на дегустации, мероприятия и культурные вечера',
            ],
          },
          {
            title: 'ℹ️ Обязательная информация (в соответствии со статьей 32 Трудового закона Латвии):',
            items: [
              '<strong>Работодатель:</strong> SIA “Brīvības 37”, рег. № 40203632383',
              '<strong>Заработная плата:</strong> €7.00–€10.00 брутто в час + чаевые',
              '<strong>Языковые требования:</strong> латышский, английский и русский обязательны; французский — преимущество',
            ],
          },
        ],
        applyIntroHtml: 'Если у вас есть <strong>любовь к людям, внимание к деталям и французский шарм</strong> — будем рады вам.',
        positionValue: 'Официант/Официантка',
      },
    },
    legalFallback: 'Juridiskais dokuments ir publicēts latviešu valodā, izmantojot Restoplace avota momentuzņēmumu.',
  }
};

export const legalRouteSlugs = ['terms', 'privacy', 'public-offer', 'personal-data-consent', 'cookie-policy'];

export const legalLabels = {
  terms: {
    en: 'Lietošanas noteikumi',
    lv: 'Lietošanas noteikumi',
    fr: 'Lietošanas noteikumi',
    ru: 'Lietošanas noteikumi',
  },
  privacy: {
    en: 'Privātuma politika',
    lv: 'Privātuma politika',
    fr: 'Privātuma politika',
    ru: 'Privātuma politika',
  },
  'public-offer': {
    en: 'Publiskais piedāvājums',
    lv: 'Publiskais piedāvājums',
    fr: 'Publiskais piedāvājums',
    ru: 'Publiskais piedāvājums',
  },
  'personal-data-consent': {
    en: 'Manu personas datu apstrāde',
    lv: 'Manu personas datu apstrāde',
    fr: 'Manu personas datu apstrāde',
    ru: 'Manu personas datu apstrāde',
  },
  'cookie-policy': {
    en: 'Sīkfailu politika',
    lv: 'Sīkfailu politika',
    fr: 'Sīkfailu politika',
    ru: 'Sīkfailu politika',
  },
};

export const specials = [
  {
    id: 'onion-soup',
    image: '/assets/img/Onion_soup.jpg',
    title: {
      en: 'Gratinated Onion Soup',
      lv: 'Sīpolu zupa ar sieru',
      fr: 'Soupe gratinée à l’oignon',
      ru: 'Луковый суп с сырной корочкой',
    },
    text: {
      en: 'Sliced onions browned in butter, served with oven-dried bread and Gruyere cheese.',
      lv: 'Sviestā apcepti sīpoli, krāsnī kaltēta maize un Gruyere siers.',
      fr: 'Oignons revenus au beurre, pain séché au four et fromage Gruyere.',
      ru: 'Лук, томлёный в сливочном масле, подсушенный хлеб и сыр Gruyere.',
    },
  },
  {
    id: 'quiche',
    image: '/assets/img/Quiche-lorraine.jpg',
    title: {
      en: 'Quiche Lorraine',
      lv: 'Quiche Lorraine',
      fr: 'Quiche Lorraine',
      ru: 'Киш Лорен',
    },
    text: {
      en: 'Shortcrust pastry with cream, eggs, Gruyere cheese and smoked pork belly.',
      lv: 'Smilšu mīklas tarte ar krējumu, olām, Gruyere sieru un kūpinātu cūkgaļu.',
      fr: 'Pâte brisée, crème, oeufs, Gruyere et poitrine fumée.',
      ru: 'Песочная основа, сливки, яйца, сыр Gruyere и копчёная грудинка.',
    },
  },
  {
    id: 'beef',
    image: '/assets/img/Beef_Bourguignon.jpg',
    title: {
      en: 'Beef Bourguignon',
      lv: 'Boeuf bourguignon',
      fr: 'Boeuf bourguignon',
      ru: 'Бёф бургиньон',
    },
    text: {
      en: 'Beef in red wine sauce with pearl onions, bacon and Paris mushrooms.',
      lv: 'Liellopa gaļa sarkanvīna mērcē ar sīpoliem, bekonu un šampinjoniem.',
      fr: 'Boeuf mijoté au vin rouge avec oignons, lardons et champignons.',
      ru: 'Говядина в соусе из красного вина с луком, беконом и шампиньонами.',
    },
  },
  {
    id: 'tarte',
    image: '/assets/img/Tarte-Tatin-Bliss.jpg',
    title: {
      en: 'Tarte Tatin',
      lv: 'Tarte Tatin',
      fr: 'Tarte Tatin',
      ru: 'Тарт Татен',
    },
    text: {
      en: 'Upside-down caramelized apple tart served with fresh local sour cream.',
      lv: 'Karameļu ābolu tarte, pasniegta ar svaigu vietējo skābo krējumu.',
      fr: 'Tarte renversée aux pommes caramélisées, servie avec crème locale.',
      ru: 'Перевёрнутый яблочный тарт с карамелью и свежей местной сметаной.',
    },
  },
];

export const menuFallback = {
  updatedAt: null,
  source: 'local fallback',
  locales: Object.fromEntries(locales.map((locale) => [locale, {
    currencyCode: 'EUR',
    categories: [
      { id: 'breakfast', name: { en: 'Breakfast', lv: 'Brokastis', fr: 'Petit-déjeuner', ru: 'Завтраки' }[locale] },
      { id: 'starters', name: { en: 'Starters', lv: 'Uzkodas', fr: 'Entrées', ru: 'Закуски' }[locale] },
      { id: 'mains', name: { en: 'Mains', lv: 'Pamatēdieni', fr: 'Plats', ru: 'Основные блюда' }[locale] },
      { id: 'desserts', name: { en: 'Desserts', lv: 'Deserti', fr: 'Desserts', ru: 'Десерты' }[locale] },
    ],
    items: [
      { id: 'onion-soup', categoryId: 'starters', name: { en: 'Gratinated onion soup', lv: 'Sīpolu zupa ar sieru', fr: 'Soupe gratinée à l’oignon', ru: 'Луковый суп с сыром' }[locale], description: '', price: '9 EUR' },
      { id: 'quiche', categoryId: 'starters', name: 'Quiche Lorraine', description: '', price: '11 EUR' },
      { id: 'beef-bourguignon', categoryId: 'mains', name: { en: 'Beef Bourguignon', lv: 'Boeuf bourguignon', fr: 'Boeuf bourguignon', ru: 'Бёф бургиньон' }[locale], description: '', price: '24 EUR' },
      { id: 'tarte-tatin', categoryId: 'desserts', name: 'Tarte Tatin', description: '', price: '9 EUR' },
    ],
  }]))
};

export const localGalleryFallback = [
  { src: '/assets/img/gallery/1_Vivien_and_Oysters.jpg', alt: 'Vivien oysters and table setting' },
  { src: '/assets/img/gallery/2_Vivien_at_Work.jpg', alt: 'Vivien team at work' },
  { src: '/assets/img/gallery/3_Wine_Stand.jpg', alt: 'Wine stand at Brasserie Vivien' },
  { src: '/assets/img/gallery/4_The_Mim.jpg', alt: 'Brasserie Vivien interior moment' },
  { src: '/assets/img/gallery/5_Accordeonist.jpg', alt: 'Accordionist at Vivien' },
  { src: '/assets/img/gallery/6_Seiling_with_lamps.jpg', alt: 'Vivien ceiling lamps' },
  { src: '/assets/img/gallery/7_Opera_Singer.jpg', alt: 'Opera singer at Vivien' },
  { src: '/assets/img/gallery/8_Guitar_and_Singer.jpg', alt: 'Guitar and singer at Vivien' },
];

export function t(locale) {
  return content[locale] || content.en;
}

export function withBase(path = '/') {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}` || '/';
}

export function canonicalUrl(path) {
  const normalized = path.replace(/^\//, '');
  return new URL(normalized, site.domain + '/').toString();
}

export function localizedPath(locale, kind = 'home', params = {}) {
  if (kind === 'book') return '/book/';
  if (kind === 'home') return `/${locale}/`;
  if (kind === 'gift') return `/${locale}/gift-card/`;
  if (kind === 'giftThanks') return `/${locale}/gift-card/thanks/`;
  if (kind === 'review') return `/${locale}/review/`;
  if (kind === 'loyalty') return `/${locale}/loyalty/`;
  if (kind === 'waiter') return `/${locale}/jobs/waiter/`;
  if (kind === 'maitre') return '/en/jobs/maitre-d-hotel/';
  if (kind === 'legal') return `/${locale}/${params.legal}/`;
  return `/${locale}/`;
}

export function alternatesFor(kind, params = {}) {
  const supported = kind === 'maitre' ? ['en'] : locales;
  const links = supported.map((locale) => ({
    locale,
    href: canonicalUrl(localizedPath(locale, kind, params)),
  }));
  const xDefault = canonicalUrl(localizedPath(supported.includes('en') ? 'en' : supported[0], kind, params));
  return { links, xDefault };
}

export function getMenu(locale) {
  return menuCache?.locales?.[locale]?.items?.length ? menuCache.locales[locale] : menuFallback.locales[locale];
}

export function getGallery() {
  return galleryCache?.items?.length ? galleryCache.items : localGalleryFallback;
}

export function allSitemapRoutes() {
  const records = [];
  for (const locale of locales) {
    records.push({ kind: 'home', locale, path: localizedPath(locale, 'home'), alternates: alternatesFor('home') });
    records.push({ kind: 'gift', locale, path: localizedPath(locale, 'gift'), alternates: alternatesFor('gift') });
    records.push({ kind: 'giftThanks', locale, path: localizedPath(locale, 'giftThanks'), alternates: alternatesFor('giftThanks') });
    records.push({ kind: 'review', locale, path: localizedPath(locale, 'review'), alternates: alternatesFor('review') });
    records.push({ kind: 'loyalty', locale, path: localizedPath(locale, 'loyalty'), alternates: alternatesFor('loyalty') });
    records.push({ kind: 'waiter', locale, path: localizedPath(locale, 'waiter'), alternates: alternatesFor('waiter') });
    for (const legal of legalRouteSlugs) {
      records.push({ kind: 'legal', locale, path: localizedPath(locale, 'legal', { legal }), alternates: alternatesFor('legal', { legal }) });
    }
  }
  records.push({ kind: 'book', locale: 'en', path: localizedPath('en', 'book'), alternates: { links: [], xDefault: canonicalUrl('/book/') } });
  records.push({ kind: 'maitre', locale: 'en', path: localizedPath('en', 'maitre'), alternates: alternatesFor('maitre') });
  return records;
}
