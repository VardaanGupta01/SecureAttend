import { Router } from 'express';
import { success } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as attendanceService from '../services/attendanceService.js';
import { CourseClass } from '../models/CourseClass.js';
import { User } from '../models/User.js';

const router = Router();

router.post(
  '/attendance/initiate',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.initiateAttendance(req.body);
    res.json(success(attendance, 'QR verification successful. Proceed to location verification.'));
  })
);

router.post(
  '/attendance/verify-location',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.verifyLocation(req.body);
    res.json(success(attendance, 'Location verified. Proceed to face verification.'));
  })
);

router.post(
  '/attendance/verify-face',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.verifyFace(req.body);
    res.json(success(attendance, 'Face verified. Awaiting professor verification.'));
  })
);

router.get(
  '/attendance/:attendanceId',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getAttendanceById(req.params.attendanceId);
    if (!attendance) return res.status(404).send();
    res.json(success(attendance));
  })
);

router.get(
  '/:studentId/classes',
  asyncHandler(async (req, res) => {
    const classes = await CourseClass.find({ studentIds: req.params.studentId });
    res.json(success(classes.map((c) => c.toJSON())));
  })
);

router.get(
  '/:studentId/attendance',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getStudentAttendance(req.params.studentId);
    res.json(success(attendance));
  })
);

router.get(
  '/:studentId',
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.studentId);
    if (!student) throw new Error('Student not found');
    res.json(success(student.toJSON()));
  })
);

router.delete(
  '/:studentId/attendance/all',
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.studentId);
    if (!student) throw new Error('Student not found');
    await attendanceService.deleteAllStudentAttendance(req.params.studentId);
    res.json(success(null, 'Attendance history cleared successfully'));
  })
);

export default router;
