import express, { Response } from 'express';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { SoilReport } from '../models/SoilReport';
import { calculateFertilizer, SUPPORTED_CROPS, AREA_UNITS, FertilizerCalcInput } from '../services/fertilizerCalculatorService';
import { getFertilizerAIRecommendation } from '../services/fertilizerAI';

const router = express.Router();

// GET /api/fertilizer-calculator/meta — crops list + area units
router.get('/meta', (_req, res: Response) => {
  res.json({ success: true, crops: SUPPORTED_CROPS, areaUnits: AREA_UNITS });
});

// POST /api/fertilizer-calculator/calculate
// Body: { crop, areaValue, areaUnit, method, soilReportId? }
router.post('/calculate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { crop, areaValue, areaUnit, method, soilReportId } = req.body;

    if (!crop || !areaValue || !areaUnit) {
      return res.status(400).json({ error: 'crop, areaValue, and areaUnit are required' });
    }

    const calcMethod = method === 'crop' ? 'crop' : 'soil';

    const area = parseFloat(areaValue);
    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ error: 'areaValue must be a positive number' });
    }

    let soil: FertilizerCalcInput['soil'] | undefined;
    let soilType: string | undefined;
    let soilPH: number | undefined;

    if (calcMethod === 'soil' && soilReportId) {
      const report = await SoilReport.findById(soilReportId).lean();
      if (report && report.farmerId.toString() === req.user!.userId) {
        soil = {
          nitrogen: report.nitrogen,
          phosphorus: report.phosphorus,
          potassium: report.potassium,
          organicCarbon: report.organicCarbon,
          pH: report.pH,
        };
        soilType = report.soilType;
        soilPH = report.pH;
      }
    } else if (calcMethod === 'soil' && !soilReportId) {
      return res.json({
        success: true,
        data: calculateFertilizer({ crop, areaValue: area, areaUnit, method: 'crop' }),
      });
    }

    const calculation = calculateFertilizer({ crop, areaValue: area, areaUnit, method: calcMethod, soil });

    // Get AI recommendation (async, non-blocking for response)
    const aiRecommendation = await getFertilizerAIRecommendation({
      calculation,
      soilType,
      soilPH,
      organicCarbon: soil?.organicCarbon,
      ec: soil?.ec,
    });

    return res.json({
      success: true,
      data: calculation,
      ai: aiRecommendation,
    });
  } catch (err: any) {
    console.error('Fertilizer calculator error:', err);
    res.status(500).json({ error: err.message || 'Calculation failed' });
  }
});

// GET /api/fertilizer-calculator/soil-reports — list farmer's soil reports for selector
router.get('/soil-reports', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await SoilReport.find({ farmerId: req.user!.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('soilType soilHealthScore soilHealthStatus createdAt nitrogen phosphorus potassium')
      .lean();
    res.json({ success: true, data: reports });
  } catch {
    res.status(500).json({ error: 'Failed to fetch soil reports' });
  }
});

export default router;
