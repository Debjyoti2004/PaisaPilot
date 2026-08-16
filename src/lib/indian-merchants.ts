// Server-side only — never import this on the client

function gen(a: string[], b: string[]): string[] {
  return a.flatMap(x => b.map(y => `${x} ${y}`))
}

// ── Prefixes ────────────────────────────────────────────────────────────────

const RELIGIOUS = [
  'Sri','Shree','Shri','Sai','Jai','Om','Dev','Guru','Ram','Krishna',
  'Ganesh','Lakshmi','Durga','Saraswati','Shiva','Vishnu','Radha','Balaji',
  'Tirupati','Vaishno','Ambe','Mata','Prabhu','Swami','Baba','Thakur',
  'Maharaj','Hanuman','Shankar','Mahadev','Natraj','Murugan','Ayyappa',
  'Sabari','Venkatesh','Padmavathi','Chamundi','Yellamma','Datta','Venkateswara',
]

const INDIAN_NAMES = [
  'Rajesh','Suresh','Mahesh','Dinesh','Ramesh','Naresh','Umesh','Yogesh','Ganesh','Nitesh',
  'Anil','Sunil','Kapil','Mukul','Rahul','Anup','Sandeep','Pradeep','Kuldeep','Hardeep',
  'Harish','Girish','Manish','Ashish','Satish','Nitish','Varun','Tarun','Arun','Karun',
  'Arjun','Kiran','Mohan','Sohan','Rohan','Gopal','Murali','Ravi','Sanjay','Vijay',
  'Ajay','Uday','Manoj','Anand','Prasad','Chandan','Nandan','Pavan','Bhuvan','Jeevan',
  'Rajan','Madan','Shyam','Govind','Devraj','Deepak','Vivek','Navin','Pravin','Lavin',
  'Bharat','Pratap','Dilip','Philip','Ramakant','Shrikant','Shashikant','Balakrishna',
  'Venkat','Suresh','Ramesh','Naresh','Gajanan','Madhukar','Sharad','Milind','Nilesh',
  'Abhijit','Abhishek','Akhilesh','Amitabh','Arvind','Ashutosh','Devendra','Dhruv',
  'Gaurav','Himanshu','Jayesh','Kamlesh','Lokesh','Navneet','Pankaj','Rajendra','Sanjeev',
  'Sharma','Gupta','Patel','Shah','Singh','Joshi','Mehta','Desai','Rao','Reddy',
  'Nair','Pillai','Iyer','Naidu','Choudhary','Verma','Mishra','Pandey','Tiwari','Dubey',
  'Shukla','Srivastava','Aggarwal','Garg','Bansal','Mittal','Jindal','Agarwal','Modi','Jain',
  'Bose','Roy','Das','Dey','Ghosh','Sen','Mukherjee','Chatterjee','Banerjee','Chakraborty',
  'Narasimha','Subramanian','Venkataraman','Krishnamurthy','Swaminathan','Raghunathan',
]

const ADJECTIVES = [
  'New','Old','Classic','Modern','Premium','Super','Grand','Royal','National','Indian',
  'Golden','Silver','Diamond','Traditional','Heritage','Authentic','Famous','Popular',
  'Original','Pure','Fresh','Natural','Organic','Desi','Local','Best','Top','First',
  'Pioneer','Leading','Trusted','Reliable','Quality','Elite','Prime','Star','Imperial',
  'Platinum','Exclusive','Deluxe','Luxury','Budget','Economy','Value','Choice','Select',
  'United','Universal','Global','International','Continental','Oriental','Central',
  'Metro','City','Urban','Rural','Village','Town','Hill','River','Lake','Garden',
  'Bharat','Hindustan','Swadeshi','Swachh','Green','Eco','Smart','Digital','Express',
]

const CITIES = [
  'Delhi','Mumbai','Pune','Bangalore','Hyderabad','Chennai','Kolkata','Ahmedabad',
  'Jaipur','Lucknow','Surat','Kanpur','Nagpur','Indore','Bhopal','Patna','Vadodara',
  'Ludhiana','Agra','Nashik','Faridabad','Meerut','Rajkot','Varanasi','Aurangabad',
  'Amritsar','Ranchi','Coimbatore','Gwalior','Vijayawada','Jodhpur','Madurai','Raipur',
  'Kota','Guwahati','Chandigarh','Solapur','Mysore','Gurgaon','Jalandhar','Noida',
  'Bhubaneswar','Salem','Jamshedpur','Kochi','Mangalore','Nellore','Udaipur','Jammu',
  'Siliguri','Ujjain','Dehradun','Kolhapur','Ajmer','Erode','Hubli','Tirunelveli',
  'Rajahmundry','Nizamabad','Guntur','Bhavnagar','Gandhinagar','Jamnagar','Mehsana',
  'Vapi','Porbandar','Bharuch','Morbi','Anand','Navsari','Valsad','Gondal','Junagadh',
  'Tiruppur','Vellore','Thanjavur','Cuddalore','Tirupati','Nellore','Kurnool','Warangal',
  'Karimnagar','Khammam','Nalgonda','Adilabad','Vizianagaram','Kakinada','Ongole',
  'Tumkur','Davangere','Shimoga','Bellary','Bijapur','Gulbarga','Raichur','Hassan',
  'Mandya','Udupi','Bidar','Chikmagalur','Dharwad','Gadag','Haveri','Koppal','Bagalkot',
  'Thrissur','Kozhikode','Kollam','Palakkad','Alappuzha','Malappuram','Kannur','Kasaragod',
]

const STATES = [
  'UP','Bihar','Rajasthan','Maharashtra','Gujarat','Tamil Nadu','Karnataka','Kerala',
  'West Bengal','Andhra','Telangana','Odisha','MP','Chhattisgarh','Jharkhand',
  'Uttarakhand','Himachal','Punjab','Haryana','Assam','Goa','Delhi',
]

// ── Food & Restaurant ───────────────────────────────────────────────────────

const FOOD_ITEMS = [
  'Biryani','Paneer','Dosa','Idli','Vada','Samosa','Chai','Kebab','Tikka','Haleem',
  'Korma','Nihari','Kheema','Bhatura','Chole','Rajma','Dal','Roti','Paratha','Naan',
  'Kulcha','Puri','Appam','Uttapam','Pesarattu','Upma','Poha','Khichdi','Kheer',
  'Gulab Jamun','Jalebi','Halwa','Barfi','Ladoo','Rasgulla','Sandesh','Peda','Kulfi',
  'Lassi','Thandai','Nimbu Pani','Aam Panna','Jal Jeera','Sharbat','Chaas','Sherbet',
  'Mutton','Chicken','Fish','Prawn','Egg','Veg','Pure Veg','Non Veg',
  'Punjabi','South Indian','North Indian','Mughal','Hyderabadi','Bengali','Gujarati',
  'Rajasthani','Maharashtrian','Kerala','Chettinad','Andhra','Udupi','Kashmiri',
  'Malabar','Awadhi','Lucknawi','Sindhi','Marwari','Konkani','Goan','Mangalorean',
  'Tandoor','Masala','Spice','Herb','Organic','Home Style','Family','Tiffin',
  'Pav Bhaji','Bhel Puri','Pani Puri','Sev Puri','Dahi Puri','Ragda','Misal',
  'Vadapav','Kachori','Aloo Tikki','Chaat','Gol Gappe','Papdi Chaat',
  'Filter Coffee','Masala Chai','Elaichi Chai','Ginger Tea','Lemon Tea',
]

const EATERY_TYPES = [
  'Restaurant','Hotel','Dhaba','Canteen','Corner','House','Palace','Kitchen',
  'Cafe','Bistro','Junction','Point','Centre','Stall','Bhojanalaya','Mess',
]

// ── Business Types ──────────────────────────────────────────────────────────

const STORE_TYPES = [
  'Store','Mart','Shop','Traders','Enterprises','Agency','Centre','House',
  'Plaza','Hub','World','Zone','Point','Corner','Emporium','Collection',
  'Showroom','Depot','Distributor','Wholesale','Retail','Suppliers','Dealers',
  'Brothers','Sons','Associates','Industries','Works','Company',
]

const MEDICAL_TYPES = [
  'Medical Store','Medical Hall','Pharmacy','Chemist','Drug Store',
  'Health Centre','Clinic','Nursing Home','Hospital','Diagnostic Centre',
  'Pathology Lab','X-Ray Centre','Dental Clinic','Eye Hospital','Skin Clinic',
]

const SERVICE_TYPES = [
  'Salon','Beauty Parlour','Barber Shop','Tailor','Boutique','Laundry',
  'Dry Cleaners','Courier','Travels','Transport','Logistics','Packers',
  'Electronics Repair','Mobile Repair','Computer Centre','AC Service',
  'Coaching Centre','Tuition Centre','Institute','Academy','Classes',
  'Gym','Fitness Centre','Yoga Centre','Spa','Wellness Centre',
  'Printing Press','Xerox','Photocopy','Stationery','Gift Shop',
]

const CONSTRUCTION_TYPES = [
  'Hardware','Paint Shop','Cement Store','Steel Centre','Plywood Depot',
  'Tiles Gallery','Sanitary Store','Electrical Store','Pipe Fittings',
  'Glass Works','Marble Depot','Granite Store','Aluminium Works',
]

const PRODUCT_TYPES = [
  'Electronics','Mobile','Computer','Laptop','TV','AC','Refrigerator',
  'Furniture','Mattress','Clothing','Garments','Textiles','Fabric',
  'Saree','Lehenga','Kurta','Shoes','Footwear','Bags','Luggage',
  'Jewellery','Gold','Silver','Watches','Books','Stationery','Toys',
  'Sports','Gym Equipment','Hardware','Paint','Cement','Steel',
  'Auto Parts','Tyres','Batteries','Oil','Tractor Parts','Seeds',
  'Fertilizer','Pesticide','Cattle Feed','Poultry Feed',
  'Gift','Flowers','Balloon','Decoration','Events','Photography',
  'Crockery','Utensils','Vessels','Plastic','Rubber','Chemical',
]

// ── Known Brands ────────────────────────────────────────────────────────────

const KNOWN_BRANDS: string[] = [
  // Food delivery & quick commerce
  'Swiggy','Zomato','Blinkit','Zepto','Dunzo','BigBasket','BB Daily',
  'Swiggy Instamart','JioMart','Milk Basket','Ola Dash','FreshToHome',
  'Country Delight','Supr Daily','Society App','Daily Ninja',

  // Restaurants & QSR
  "McDonald's",'KFC','Burger King',"Domino's",'Pizza Hut','Subway','Starbucks',
  'Cafe Coffee Day','Haldiram','Saravana Bhavan','MTR','Chai Point','Chaayos',
  'Wow Momo','Behrouz Biryani','Faasos','Box8','Biryani By Kilo','Paradise Biryani',
  'Barbeque Nation','Social','Smoke House Deli','The Beer Cafe','Hard Rock Cafe',
  'TGI Fridays','Chili\'s','Mainland China','Copper Chimney','Punjabi By Nature',
  'Bukhara','Moti Mahal','Karim\'s','Al Jawahar','Tunday Kababi','Idrees',
  'Hotel Saravana Bhavan','Annapoorna','Murugan Idli','Junior Kuppanna',
  'Nandhana Palace','Nagarjuna','Chutneys','Paradise Secunderabad',
  'Bawarchi','Shah Ghouse','Cafe Bahar','Niloufer','Biryani Pot',
  'Fresh Menu','Faasos','Inner Chef','Daily Bowl','Oven Story',
  'The Good Bowl','Mojo Pizza','Bachon Ki Dukan','AB\'s Absolute Barbeques',
  'Hoppipola','The Irish House','Toit','Arbor Brewing','Gateway Brewing',
  'The Bombay Canteen','O Pedro','Masque','Farzi Cafe','Mast Kalandar',

  // Grocery & retail
  'DMart','Reliance Fresh','More Supermarket',"Spencer's",'Big Bazaar',
  "Nature's Basket",'Lulu Mall','Metro Cash & Carry','Spar','Heritage Fresh',
  'Nilgiris','Star Bazaar','Smart Bazaar','Reliance Mart','Jio Point',
  'Trustmart','Fabmart','Amazon Fresh','Grofers','PepperTap',

  // E-commerce
  'Amazon','Flipkart','Myntra','AJIO','Meesho','Nykaa','Snapdeal',
  'Tata Cliq','Croma','Vijay Sales','Reliance Digital','Apple Store',
  'Samsung Store','Poorvika','Big C','E Zone','Pai Electronics',
  'Lot Mobiles','Univercell','Sangeetha Mobiles','Cell Point',
  'The Mobile Store','Lotto Mobiles','Hotspot',

  // Fashion & lifestyle
  'Westside','Shoppers Stop','Lifestyle','Pantaloons','Max Fashion',
  'H&M','Zara','Puma','Nike','Adidas','Decathlon','Levi\'s',
  'Wrangler','Arrow','Raymond','Peter England','Van Heusen',
  'Louis Philippe','Park Avenue','Blackberry','Turtle','Monte Carlo',
  'United Colors of Benetton','Allen Solly','Woodland','Liberty Shoes',
  'Bata','Sreeleathers','Hidesign','Caprese','Lavie','Baggit',
  'Campus Shoes','Red Tape','Action Shoes','Sparx','Asian Shoes',
  'VIP Bags','Safari Bags','American Tourister','Samsonite',
  'FabIndia','Anokhi','Jaypore','Global Desi','W for Woman','Biba',
  'Aurelia','Soch','Melange','AND','Ritu Kumar','Sabyasachi','Manish Malhotra',
  'Manyavar','Mohey','Ethnic Plus','Indigo Nation','Being Human',
  'Spykar','Lee','Pepe Jeans','Flying Machine','Numero Uno',

  // Pharmacy & health
  'Apollo Pharmacy','MedPlus','Netmeds','PharmEasy','1mg','Tata 1mg',
  'Practo','HealthKart','Guardian Pharmacy','Frank Ross','Aster Pharmacy',
  'Medlife','Zigy','Myra Medicines','Generico','Jan Aushadhi',
  'Fortis Hospital','Apollo Hospital','Max Hospital','Manipal Hospital',
  'Narayana Health','Medanta','Aster CMI','Columbia Asia','Cloudnine',
  'Motherhood','Hiranandani Hospital','Lilavati Hospital','Kokilaben',
  'Breach Candy','Bombay Hospital','Hinduja Hospital','Holy Spirit',
  'Wockhardt','Global Hospital','Jupiter Hospital','Sahyadri Hospital',
  'Ruby Hall Clinic','Inamdar Hospital','Deenanath Mangeshkar',
  'KIMS','Yashoda','Sunshine','Omni','Care Hospital','Star Hospital',
  'AIIMS','NIMHANS','PGI','JIPMER','CMC Vellore','KEM','Lokmanya Tilak',
  'Gandhi Hospital','Osmania General','King George','SGPGI','Sanjay Gandhi',

  // Beauty & personal care
  'Nykaa','Lakme','Lotus Herbals','Himalaya','Biotique','Mamaearth',
  'The Body Shop','Forest Essentials','Kama Ayurveda','Beardo',
  'Bombay Shaving Company','WOW Skin Science','Minimalist','Plum',
  'Dot & Key','MCaffeine','Pilgrim','Sugar Cosmetics','Colorbar',
  'Elle 18','NYX','Maybelline','L\'Oreal','Revlon','MAC','Clinique',
  'Olay','Pond\'s','Dove','Vaseline','Parachute','Dabur','Patanjali',
  'Emami','Bajaj Consumer','CavinKare','Godrej Consumer','Marico',
  'VLCC','Shahnaz Husain','Nature\'s Essence','Biotique','Jovees',
  'Just Herbs','SoulTree','Conscious Chemist','Be Bodywise','mCaffeine',

  // Telecom & DTH
  'Jio','Airtel','BSNL','Vi','Vodafone','Idea','MTNL',
  'Tata Sky','Dish TV','Sun Direct','Hathway','Den Networks',
  'Siti Networks','Excitel','ACT Fibernet','You Broadband','Tikona',
  'BBNL','TSFI','Airjaldi','RailTel','iCall',

  // Streaming & OTT
  'Netflix','Disney+ Hotstar','Amazon Prime Video','SonyLIV','Zee5',
  'JioCinema','ALTBalaji','MX Player','Voot','Eros Now','Hungama',
  'ShemarooMe','Aha','Sun NXT','Hoichoi','Planet Marathi',
  'Lionsgate Play','Apple TV+','Discovery+','BookMyShow',

  // Banking
  'SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Bank','Yes Bank',
  'PNB','Canara Bank','Bank of Baroda','Bank of India','Union Bank',
  'Indian Bank','Central Bank','UCO Bank','IDBI Bank','IDFC Bank',
  'Bandhan Bank','Federal Bank','South Indian Bank','Karur Vysya Bank',
  'DCB Bank','City Union Bank','RBL Bank','IndusInd Bank','Nainital Bank',
  'Lakshmi Vilas Bank','Dhanlaxmi Bank','Jammu & Kashmir Bank',
  'Kerala Gramin Bank','Andhra Pragathi Grameena Bank',
  'Gramin Bank','Cooperative Bank','Urban Cooperative Bank',

  // Insurance
  'LIC','HDFC Life','Max Life','ICICI Prudential','Bajaj Allianz',
  'Reliance Life','SBI Life','Birla Sun Life','Tata AIA',
  'Edelweiss Tokio','Aviva Life','Canara HSBC','PNB MetLife',
  'Star Health','New India Assurance','Oriental Insurance',
  'National Insurance','United India Insurance','IFFCO Tokio',
  'Royal Sundaram','Reliance General','Go Digit','Acko','Niva Bupa',

  // Investments & fintech
  'Zerodha','Groww','Upstox','Angel One','5Paisa','ICICI Direct',
  'HDFC Securities','Sharekhan','Kotak Securities','Motilal Oswal',
  'Edelweiss','IIFL','Paytm Money','INDmoney','Fisdom','Kuvera',
  'Scripbox','ET Money','Wealthy','Goalwise','Quantum','PPFAS',
  'SBI Mutual Fund','HDFC Mutual Fund','ICICI Prudential MF',
  'Aditya Birla MF','Kotak MF','Nippon India MF','Axis MF','UTI MF',
  'DSP MF','Franklin Templeton','Mirae Asset','PGIM India',
  'Paytm','PhonePe','Google Pay','CRED','Slice','Jupiter','Fi Money',
  'Razorpay','PayU','Cashfree','Instamojo','BillDesk','PayNearby',
  'Eko','Business Correspondent','Mswipe','Pine Labs','Innoviti',

  // Ride & transport
  'Ola','Uber','Rapido','Namma Yatri','InDrive','Blu Smart',
  'Bounce','Vogo','Yulu','Mobycy','Hey Dost','Chalo','Shuttl',
  'BMTC','DTC','KSRTC','MSRTC','GSRTC','APSRTC','TSRTC',
  'Metro Rail','Delhi Metro','Namma Metro','Mumbai Metro',
  'Hyderabad Metro','Chennai Metro','Kochi Metro','Pune Metro',
  'RedBus','IRCTC','MakeMyTrip','Cleartrip','Yatra','Goibibo',
  'EaseMyTrip','Ixigo','AbhiBus','IntrCity SmartBus','Zingbus',

  // Airlines
  'IndiGo','Air India','SpiceJet','Vistara','Akasa Air','Go First',
  'Blue Dart Aviation','Alliance Air','Star Air','FlyBig',

  // Hotels & stays
  'Taj Hotels','Oberoi','ITC Hotels','Leela Hotels','Marriott',
  'Hyatt','Hilton','IHG','Radisson','Novotel','Ibis','OYO',
  'Treebo','FabHotels','Zostel','Moustache','Backpacker Panda',
  'Lemon Tree','Keys Hotels','Sarovar Hotels','WelcomHeritage',
  'Fortune Hotels','Ginger Hotels','Bloom Hotel','Fern Hotels',
  'Clarks','Royal Orchid','Goldfinch','Park Hotels',

  // Fuel stations
  'Indian Oil','HP Petrol','BPCL','Reliance Petrol','Shell',
  'Essar Oil','Nayara Energy','Bharat Petroleum','Hindustan Petroleum',

  // Auto & vehicles
  'Maruti Suzuki','Hyundai','Tata Motors','Mahindra','Honda',
  'Toyota','Renault','Nissan','Kia','Volkswagen','Skoda','Jeep',
  'MG Motor','Datsun','Hero MotoCorp','Bajaj Auto','TVS','Royal Enfield',
  'Yamaha','Suzuki','Kawasaki','KTM','Honda Bikes','Jawa','Benelli',
  'Ather Energy','Ola Electric','Revolt','Okinawa','Hero Electric',
  'Maruti Service','Honda Service','Hyundai Service','Tata Authorized',
  'Mahindra Authorized','Toyota Dealer','Hero Showroom',

  // Electronics & appliances
  'Samsung','Apple','OnePlus','Xiaomi','Realme','Oppo','Vivo',
  'Nokia','Motorola','LG','Sony','Panasonic','Philips','Bosch',
  'Whirlpool','Haier','Voltas','Blue Star','Daikin','Carrier',
  'Mitsubishi','Hitachi','Godrej Appliances','Videocon','Bajaj',
  'Orient','Havells','Crompton','Usha','V-Guard','Bajaj Electricals',
  'Anchor','Legrand','Schneider','Finolex','Polycab','KEI','RR Kabel',
  'Luminous','Exide','Amaron','Su-Kam','Microtek','Okaya',

  // Home & furniture
  'IKEA','Pepperfry','Urban Ladder','Godrej Interio','Durian',
  'Nilkamal','Zuari','Featherlite','HomeTown','Royal Oak','Wakefit',
  'Sleepy Cat','Sunday Mattress','SleepyCat','Centuary','Kurlon',
  'Springfit','Kurl-on','Springtek','Wink & Nod','The Sleep Company',

  // Education
  "BYJU'S",'Unacademy','Vedantu','Coursera','upGrad','Simplilearn',
  'NIIT','Aptech','Whitehat Jr','Coding Ninjas','GeeksforGeeks',
  'PW (Physics Wallah)','Aakash Institute','FIITJEE','Allen Career',
  'Resonance','Bansal Classes','Career Point','Vibrant Academy',
  'TIME','IMS Learning','Career Launcher','VistaMind','Bulls Eye',
  'Mahendra','Made Easy','ACE Engineering','Gateforum','The Gate Academy',
  'British Council','IDP IELTS','ETS GRE','Princeton Review',
  'Jamboree','Manya - The Princeton Review','Kaplan','Manhattan Prep',

  // Food brands
  'Amul','Mother Dairy','Nestle','Britannia','Parle','ITC Foods',
  'Haldiram\'s','Bikano','Bikanervala','MTR Foods','Gits','Priya Foods',
  'Aachi','Catch Spices','MDH','Everest','Badshah Masala','Ramdev',
  'Patanjali','Dabur','Baidyanath','Zandu','Emami','Chyawanprash',
  'Nandini','Heritage','Vijaya','Aavin','Milma','Saras','Parag','Pravin',
  'Vadilal','Kwality Walls','Baskin Robbins','Natural Ice Cream',
  'Havmor','Dinshaw\'s','Arun Ice Cream','Creambell',

  // Property
  'MagicBricks','99acres','Housing.com','NoBroker','Makaan.com',
  'Square Yards','PropTiger','JLL','Knight Frank','Anarock',
  'HDFC Realty','Indiabulls Real Estate','DLF','Godrej Properties',
  'Prestige Group','Brigade Group','Embassy Group','Sobha',
  'Puravankara','Mahindra Lifespaces','Tata Housing','L&T Realty',

  // Logistics & courier
  'Delhivery','BlueDart','DHL','FedEx','DTDC','Ekart','Xpressbees',
  'Ecom Express','Maruti Courier','First Flight','Shadowfax','Porter',
  'Lalamove','Dunzo Business','Borzo','WeFast','Loadshare','Rivigo',
  'Blackbuck','Truxapp','GATI','VRL Logistics','TCI','Safexpress',

  // On-demand services
  'Urban Company','UrbanClap','Housejoy','Helpr','YoFix','Mr Right',
  'Handyman','Sulekha','JustDial','IndiaMart','TradeIndia',

  // Coworking
  'WeWork','Awfis','IndiQube','91Springboard','CoWrks','Smartworks',
  'Regus','Innov8','BHIVE','BHiVE Workspace','Daftar','AltF',

  // Gaming & fantasy
  'Dream11','My11Circle','MPL','WinZo','Rummy Circle','Ace2Three',
  'Adda52','Junglee Games','Baazi Games','Head Ball','Loco',

  // Utilities
  'BESCOM','MSEDCL','BSES','TNEB','Tata Power','Adani Electricity',
  'BWSSB','Jal Board','IGL','MGL','Adani Gas','GAIL','Torrent Power',
  'CESC','WBSEDCL','UPPCL','APEPDCL','TSSPDCL','KESCO','PSPCL',
  'HESCOM','MESCOM','GESCOM','CPDCL','NPDCL','DHBVN','UHBVN','PVVNL',

  // Government & PSU
  'IRCTC','Indian Railways','Air India Express','Pawan Hans',
  'ONGC','Coal India','SAIL','BHEL','NTPC','NHPC','NPCIL','BPCL',
  'Indian Oil Corporation','Hindustan Petroleum','Gail India',
  'SBI Cards','SBI Life','SBI Mutual Fund','LIC Housing Finance',
  'Post Office','India Post','Speed Post','Department of Posts',
  'Passport Office','VAHAN','Parivahan','eChallan','FASTag NHAI',

  // Common local vendor types (standalone entries)
  'Kirana Store','General Store','Provision Store','Medical Store',
  'Vegetable Vendor','Fruit Shop','Milk Booth','Dairy','Bakery',
  'Sweet Shop','Tea Stall','Juice Corner','Pan Shop','Cigarette Shop',
  'Barber','Salon','Tailoring Shop','Laundry','Photostat',
  'Auto Rickshaw','Tempo','School Bus','Van Service','Cab',
  'Water Tanker','LPG Cylinder','Newspaper','Magazine','Books',
  'Stationery Shop','Xerox Centre','Printing','Courier Service',
  'School Fees','College Fees','Tuition Fees','Library',
  'Electricity Bill','Water Bill','Property Tax','Society Maintenance',
  'Gym Membership','Yoga Class','Dance Class','Music Class',
  'Swimming Pool','Sports Club','Cricket Academy','Football Club',
  'Temple Donation','Church Donation','Mosque Donation','Gurudwara',
  'Charity','NGO Donation','PM Relief Fund','CM Relief Fund',
  'Wedding Catering','Event Management','Decoration','DJ Service',
  'Photography','Videography','Mehendi','Makeup Artist','Florist',
  'Tent House','Marriage Hall','Banquet Hall','Kalyana Mandapam',
  'Astrologer','Numerologist','Vastu Consultant','Pooja Items',
  'Pandit','Priest','Mosque Committee','Wakf Board',
]

// ── Combine everything ───────────────────────────────────────────────────────

function buildList(): string[] {
  const parts: string[] = [
    ...KNOWN_BRANDS,

    // Religious prefix combinations
    ...gen(RELIGIOUS, EATERY_TYPES),        // 40 × 16 = 640
    ...gen(RELIGIOUS, STORE_TYPES),         // 40 × 29 = 1160
    ...gen(RELIGIOUS, MEDICAL_TYPES),       // 40 × 15 = 600

    // Indian name combinations
    ...gen(INDIAN_NAMES, STORE_TYPES),      // 86 × 29 = 2494
    ...gen(INDIAN_NAMES, EATERY_TYPES),     // 86 × 16 = 1376
    ...gen(INDIAN_NAMES, MEDICAL_TYPES),    // 86 × 15 = 1290
    ...gen(INDIAN_NAMES, SERVICE_TYPES),    // 86 × 29 = 2494
    ...gen(INDIAN_NAMES, CONSTRUCTION_TYPES), // 86 × 13 = 1118

    // Adjective prefix combinations
    ...gen(ADJECTIVES, STORE_TYPES),        // 50 × 29 = 1450
    ...gen(ADJECTIVES, EATERY_TYPES),       // 50 × 16 = 800
    ...gen(ADJECTIVES, SERVICE_TYPES),      // 50 × 29 = 1450

    // City prefix combinations
    ...gen(CITIES, STORE_TYPES),            // 100 × 29 = 2900
    ...gen(CITIES, EATERY_TYPES),           // 100 × 16 = 1600
    ...gen(CITIES, SERVICE_TYPES),          // 100 × 29 = 2900

    // State prefix combinations
    ...gen(STATES, STORE_TYPES),            // 22 × 29 = 638
    ...gen(STATES, EATERY_TYPES),           // 22 × 16 = 352

    // Food item combinations
    ...gen(FOOD_ITEMS, EATERY_TYPES),       // 80 × 16 = 1280

    // Product type combinations
    ...gen(PRODUCT_TYPES, STORE_TYPES),     // 44 × 29 = 1276
  ]

  // Deduplicate, normalize
  const seen = new Set<string>()
  return parts.filter(m => {
    const key = m.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const INDIAN_MERCHANTS = buildList()
