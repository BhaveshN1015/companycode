import express, { Request, Response } from 'express';
import weatherService from '../services/weatherService';

const router = express.Router();

// GET /api/weather?latitude=..&longitude=..
router.get('/', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, location,days } = req.query;
      const requestedDays = Number(days) || 7;

if (![5,7, 10, 15].includes(requestedDays)) {
  return res.status(400).json({
    success: false,
    error: 'days must be 5, 7,10, or 15'
  });
}
 if (location) {
  const payload = await weatherService.fetchWeatherByLocationQuery(
    location as string,
    requestedDays
  );
  return res.json({ success: true, ...payload });
}

if (!latitude || !longitude) {
  return res.status(400).json({
    success: false,
    error: 'latitude and longitude or location are required'
  });
}

const data = await weatherService.fetchWeather(
  latitude as string,
  longitude as string,
  requestedDays
);

res.json({ success: true, data });
  } catch (error: any) {
    console.error('Weather fetch error:', error?.message || error);
    if (error?.name === 'LocationNotFoundError') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch weather' });
  }
});

// GET /api/weather/search?query=...
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const results = await weatherService.searchLocations(query);
    return res.json({ success: true, results });
  } catch (error: any) {
    console.error('Weather search error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to search locations' });
  }
});

export default router;










// import express, { Request, Response } from 'express';
// import weatherService from '../services/weatherService';

// const router = express.Router();

// // GET /api/weather?latitude=..&longitude=..
// router.get('/', async (req: Request, res: Response) => {
//   try {
//     const { latitude, longitude, location } = req.query;

//     if (location) {
//       const payload = await weatherService.fetchWeatherByLocationQuery(location as string);
//       return res.json({ success: true, ...payload });
//     }

//     if (!latitude || !longitude) {
//       return res.status(400).json({ success: false, error: 'latitude and longitude or location are required' });
//     }

//     const data = await weatherService.fetchWeather(latitude as string, longitude as string);

//     res.json({ success: true, data });
//   } catch (error: any) {
//     console.error('Weather fetch error:', error?.message || error);
//     if (error?.name === 'LocationNotFoundError') {
//       return res.status(404).json({ success: false, error: error.message });
//     }
//     res.status(500).json({ success: false, error: 'Failed to fetch weather' });
//   }
// });

// // GET /api/weather/search?query=...
// router.get('/search', async (req: Request, res: Response) => {
//   try {
//     const { query } = req.query;

//     if (!query || typeof query !== 'string' || !query.trim()) {
//       return res.status(400).json({ success: false, error: 'query is required' });
//     }

//     const results = await weatherService.searchLocations(query);
//     return res.json({ success: true, results });
//   } catch (error: any) {
//     console.error('Weather search error:', error?.message || error);
//     return res.status(500).json({ success: false, error: 'Failed to search locations' });
//   }
// });

// export default router;


