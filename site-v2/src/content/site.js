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
      heroKicker: 'French brasserie in Riga',
      heroTitle: 'Brasserie Vivien',
      heroText: 'Classic French cuisine, oysters, wine and art in a warm brasserie atmosphere on Brivibas iela.',
      menuCta: 'Our Menu',
      prepareTitle: 'Would you like everything to be ready when you arrive?',
      prepareText: 'Book a table and pre-order dishes before your visit.',
      prepareCta: 'Prepare the table',
      menuTitle: 'Menu',
      menuSubtitle: 'Classic French cuisine made with fresh ingredients',
      specialsTitle: 'Specials',
      specialsSubtitle: 'Vivien brasserie classics',
      galleryTitle: 'Gallery',
      gallerySubtitle: 'Recent moments from our bistro',
      careersTitle: 'We Are Hiring',
      careersSubtitle: 'Become part of the Vivien team',
      contactTitle: 'Contact',
      contactSubtitle: 'Visit us in the heart of Riga',
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
      description: 'A Vivien gift card covers a restaurant bill up to the deposited amount and can become a personal Vivien Friends Club card.',
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
      title: 'How was your visit?',
      description: 'Share private feedback with Vivien or leave a public Google review if your visit was delightful.',
      positive: 'Loved it',
      negative: 'I want to share feedback',
      privateTitle: 'Private feedback',
      message: 'What could we improve?',
      submit: 'Send private feedback',
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
      maitreTitle: 'Maitre d’hotel at Brasserie Vivien',
      intro: 'Brasserie Vivien is a lively French bistro in the heart of Riga where classic hospitality meets contemporary rhythm.',
      apply: 'Apply now',
      cover: 'Short cover letter',
      position: 'Position',
      attachment: 'CV or portfolio',
      submit: 'Send application',
    },
    legalFallback: 'This page uses the source legal text snapshot from Restoplace. Translations must be reviewed before production launch if this language is legally authoritative for your users.',
  },
  lv: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Franču bistro, brokastis, vīns un māksla',
      homeDescription: 'Franču brasserie Rīgas centrā ar klasisku virtuvi, rūpīgi atlasītiem vīniem, dāvanu kartēm un ērtu galdiņa rezervāciju.',
    },
    nav: {
      home: 'Sākums',
      menu: 'Ēdienkarte',
      specials: 'Īpašie ēdieni',
      gallery: 'Galerija',
      giftCard: 'Dāvanu karte',
      loyalty: 'Lojalitāte',
      review: 'Atsauksme',
      jobs: 'Darbs',
      contact: 'Kontakti',
      book: 'Rezervēt galdiņu',
    },
    home: {
      heroKicker: 'Franču brasserie Rīgā',
      heroTitle: 'Brasserie Vivien',
      heroText: 'Klasiska franču virtuve, austeres, vīns un māksla siltā brasserie atmosfērā Brīvības ielā.',
      menuCta: 'Ēdienkarte',
      prepareTitle: 'Vai vēlaties, lai viss būtu gatavs Jūsu ierašanās brīdī?',
      prepareText: 'Rezervējiet galdiņu un pasūtiet ēdienus pirms apmeklējuma.',
      prepareCta: 'Sagatavot galdiņu',
      menuTitle: 'Ēdienkarte',
      menuSubtitle: 'Klasiska franču virtuve no svaigām sastāvdaļām',
      specialsTitle: 'Īpašie ēdieni',
      specialsSubtitle: 'Vivien brasserie klasika',
      galleryTitle: 'Galerija',
      gallerySubtitle: 'Mirkļi no mūsu bistro',
      careersTitle: 'Mēs meklējam kolēģus',
      careersSubtitle: 'Kļūstiet par Vivien komandas daļu',
      contactTitle: 'Kontakti',
      contactSubtitle: 'Apmeklējiet mūs Rīgas centrā',
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
      name: 'Jūsu vārds',
      email: 'Jūsu e-pasts',
      phone: 'Jūsu tālrunis',
      subject: 'Temats',
      message: 'Ziņa',
      send: 'Nosūtīt',
      consent: 'Piekrītu manu personas datu apstrādei šī pieprasījuma vajadzībām.',
    },
    gift: {
      title: 'Vivien dāvanu karte',
      description: 'Vivien dāvanu karte sedz restorāna rēķinu līdz iemaksātajai summai un var kļūt par Vivien Friends Club karti.',
      formTitle: 'Dāvanu kartes pieteikums',
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
      title: 'Kā pagāja Jūsu apmeklējums?',
      description: 'Dalieties privātā atsauksmē ar Vivien vai atstājiet publisku Google atsauksmi, ja apmeklējums bija lielisks.',
      positive: 'Man patika',
      negative: 'Vēlos sniegt atsauksmi',
      privateTitle: 'Privāta atsauksme',
      message: 'Ko mēs varētu uzlabot?',
      submit: 'Nosūtīt privātu atsauksmi',
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
      waiterTitle: 'Viesmīlis / viesmīle Brasserie Vivien',
      maitreTitle: 'Maitre d’hotel Brasserie Vivien',
      intro: 'Brasserie Vivien ir dzīvīgs franču bistro Rīgas centrā, kur klasisku viesmīlību papildina mūsdienīgs ritms.',
      apply: 'Pieteikties',
      cover: 'Īsa motivācijas vēstule',
      position: 'Amats',
      attachment: 'CV vai portfolio',
      submit: 'Nosūtīt pieteikumu',
    },
    legalFallback: 'Šajā lapā izmantots Restoplace juridiskā teksta avota momentuzņēmums. Tulkojumi jāpārskata pirms production palaišanas.',
  },
  fr: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Bistro français, petit-déjeuner, vin et art',
      homeDescription: 'Brasserie française au centre de Riga avec cuisine classique, vins sélectionnés, cartes cadeaux et réservation de table en un clic.',
    },
    nav: {
      home: 'Accueil',
      menu: 'Menu',
      specials: 'Spécialités',
      gallery: 'Galerie',
      giftCard: 'Carte cadeau',
      loyalty: 'Fidélité',
      review: 'Avis',
      jobs: 'Emplois',
      contact: 'Contact',
      book: 'Réserver',
    },
    home: {
      heroKicker: 'Brasserie française à Riga',
      heroTitle: 'Brasserie Vivien',
      heroText: 'Cuisine française classique, huîtres, vin et art dans une atmosphère chaleureuse sur Brivibas iela.',
      menuCta: 'Notre menu',
      prepareTitle: 'Souhaitez-vous que tout soit prêt à votre arrivée ?',
      prepareText: 'Réservez une table et précommandez vos plats avant votre visite.',
      prepareCta: 'Préparer la table',
      menuTitle: 'Menu',
      menuSubtitle: 'Cuisine française classique avec des ingrédients frais',
      specialsTitle: 'Spécialités',
      specialsSubtitle: 'Les classiques de Vivien',
      galleryTitle: 'Galerie',
      gallerySubtitle: 'Quelques moments de notre bistro',
      careersTitle: 'Nous recrutons',
      careersSubtitle: 'Rejoignez l’équipe Vivien',
      contactTitle: 'Contact',
      contactSubtitle: 'Visitez-nous au coeur de Riga',
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
      description: 'La carte cadeau Vivien couvre l’addition jusqu’au montant déposé et peut devenir une carte Vivien Friends Club.',
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
      title: 'Comment s’est passée votre visite ?',
      description: 'Partagez un retour privé avec Vivien ou laissez un avis Google si votre visite était excellente.',
      positive: 'J’ai adoré',
      negative: 'Je veux partager un retour',
      privateTitle: 'Retour privé',
      message: 'Que pourrions-nous améliorer ?',
      submit: 'Envoyer le retour privé',
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
      waiterTitle: 'Serveur / serveuse chez Brasserie Vivien',
      maitreTitle: 'Maitre d’hotel chez Brasserie Vivien',
      intro: 'Brasserie Vivien est un bistro français vivant au coeur de Riga, où l’hospitalité classique rencontre un rythme contemporain.',
      apply: 'Postuler',
      cover: 'Courte lettre de motivation',
      position: 'Poste',
      attachment: 'CV ou portfolio',
      submit: 'Envoyer la candidature',
    },
    legalFallback: 'Cette page utilise un instantané du texte juridique source de Restoplace. Les traductions doivent être revues avant la mise en production.',
  },
  ru: {
    meta: {
      homeTitle: 'Brasserie Vivien Riga | Французское бистро, завтраки, вино и искусство',
      homeDescription: 'Французская brasserie в центре Риги с классической кухней, винами, подарочными картами и бронированием столика в одно касание.',
    },
    nav: {
      home: 'Главная',
      menu: 'Меню',
      specials: 'Специальное',
      gallery: 'Галерея',
      giftCard: 'Подарочная карта',
      loyalty: 'Лояльность',
      review: 'Отзыв',
      jobs: 'Вакансии',
      contact: 'Контакты',
      book: 'Забронировать',
    },
    home: {
      heroKicker: 'Французская brasserie в Риге',
      heroTitle: 'Brasserie Vivien',
      heroText: 'Классическая французская кухня, устрицы, вино и искусство в тёплой атмосфере brasserie на улице Brivibas.',
      menuCta: 'Наше меню',
      prepareTitle: 'Хотите, чтобы всё было готово к вашему приходу?',
      prepareText: 'Забронируйте столик и закажите блюда заранее.',
      prepareCta: 'Подготовить стол',
      menuTitle: 'Меню',
      menuSubtitle: 'Классическая французская кухня из свежих продуктов',
      specialsTitle: 'Специальное',
      specialsSubtitle: 'Классика Brasserie Vivien',
      galleryTitle: 'Галерея',
      gallerySubtitle: 'Моменты из нашего бистро',
      careersTitle: 'Мы ищем коллег',
      careersSubtitle: 'Станьте частью команды Vivien',
      contactTitle: 'Контакты',
      contactSubtitle: 'Ждём вас в центре Риги',
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
      description: 'Подарочная карта Vivien оплачивает счёт до внесённой суммы и может стать картой Vivien Friends Club.',
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
      title: 'Как прошёл ваш визит?',
      description: 'Оставьте Vivien личный отзыв или публичный отзыв в Google, если вам всё понравилось.',
      positive: 'Мне понравилось',
      negative: 'Хочу оставить отзыв',
      privateTitle: 'Личный отзыв',
      message: 'Что мы могли бы улучшить?',
      submit: 'Отправить личный отзыв',
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
      waiterTitle: 'Официант / официантка в Brasserie Vivien',
      maitreTitle: 'Метрдотель в Brasserie Vivien',
      intro: 'Brasserie Vivien — живое французское бистро в центре Риги, где классическое гостеприимство соединяется с современным ритмом.',
      apply: 'Откликнуться',
      cover: 'Короткое сопроводительное письмо',
      position: 'Позиция',
      attachment: 'CV или портфолио',
      submit: 'Отправить отклик',
    },
    legalFallback: 'Эта страница использует снимок юридического текста из Restoplace. Переводы нужно проверить до production-запуска.',
  }
};

export const legalRouteSlugs = ['terms', 'privacy', 'public-offer', 'personal-data-consent', 'cookie-policy'];

export const legalLabels = {
  terms: {
    en: 'Terms of Use',
    lv: 'Lietošanas noteikumi',
    fr: 'Conditions d’utilisation',
    ru: 'Условия использования',
  },
  privacy: {
    en: 'Privacy Policy',
    lv: 'Privātuma politika',
    fr: 'Politique de confidentialité',
    ru: 'Политика конфиденциальности',
  },
  'public-offer': {
    en: 'Public Offer',
    lv: 'Publiskais piedāvājums',
    fr: 'Offre publique',
    ru: 'Публичная оферта',
  },
  'personal-data-consent': {
    en: 'Personal Data Consent',
    lv: 'Piekrišana personas datu apstrādei',
    fr: 'Consentement aux données personnelles',
    ru: 'Согласие на обработку персональных данных',
  },
  'cookie-policy': {
    en: 'Cookie Policy',
    lv: 'Sīkfailu politika',
    fr: 'Politique des cookies',
    ru: 'Политика cookies',
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
