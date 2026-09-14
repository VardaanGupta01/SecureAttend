import { Router } from 'express';
import { success, error as errorResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as classService from '../services/classService.js';
import * as sessionService from '../services/sessionService.js';
import * as attendanceService from '../services/attendanceService.js';
import { User } from '../models/User.js';

const router = Router();

router.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const classes = await classService.getTAClasses(req.query.taId);
    res.json(success(classes));
  })
);

router.get(
  '/classes/:classId/sessions',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    if (!(await classService.taHasAccessToClass(taId, req.params.classId))) {
      return res.status(403).json(errorResponse('Access denied: You are not assigned to this class', 'ACCESS_DENIED'));
    }
    const sessions = await sessionService.getAllSessionsForClass(req.params.classId);
    res.json(success(sessions));
  })
);

router.get(
  '/sessions/:sessionId/attendance',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    const session = await sessionService.getSessionById(req.params.sessionId);
    if (!session) throw new Error(`Session not found: ${req.params.sessionId}`);
    if (!(await classService.taHasAccessToClass(taId, session.classId))) {
      return res.status(403).json(errorResponse('Access denied: You are not assigned to this class', 'ACCESS_DENIED'));
    }
    const attendance = await attendanceService.getSessionAttendance(req.params.sessionId);
    res.json(success(attendance));
  })
);

router.get(
  '/sessions/:sessionId/report',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    const session = await sessionService.getSessionById(req.params.sessionId);
    if (!session) throw new Error(`Session not found: ${req.params.sessionId}`);
    if (!(await classService.taHasAccessToClass(taId, session.classId))) {
      return res.status(403).json(errorResponse('Access denied', 'ACCESS_DENIED'));
    }

    const attendance = await attendanceService.getSessionAttendance(req.params.sessionId);
    const report = {
      sessionId: req.params.sessionId,
      totalAttendance: attendance.length,
      systemVerified: attendance.filter((a) => a.systemVerified).length,
      professorVerified: attendance.filter((a) => a.professorVerified).length,
      taVerified: attendance.filter((a) => a.taVerified).length,
      flagged: attendance.filter((a) => a.flaggedProxy).length,
      fullyApproved: attendance.filter((a) => a.systemVerified && a.professorVerified && a.taVerified).length,
      pending: attendance.filter((a) => a.systemVerified && !a.professorVerified).length,
      verificationRate: attendance.length
        ? (attendance.filter((a) => a.systemVerified && a.professorVerified).length * 100) / attendance.length
        : 0,
    };
    res.json(success(report));
  })
);

router.get(
  '/students/:studentId/attendance',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    const taClasses = await classService.getTAClasses(taId);
    const classIds = taClasses.map((c) => c.id);
    const allAttendance = await attendanceService.getStudentAttendance(req.params.studentId);
    const filtered = allAttendance.filter((a) => classIds.includes(a.classId));
    res.json(success(filtered));
  })
);

router.get(
  '/students/history',
  asyncHandler(async (req, res) => {
    const { studentRollNumber, taId } = req.query;
    const student = await User.findOne({ studentNumber: studentRollNumber });
    if (!student) throw new Error(`Student not found with roll number: ${studentRollNumber}`);

    const taClasses = await classService.getTAClasses(taId);
    const classIds = taClasses.map((c) => c.id);
    const allAttendance = await attendanceService.getStudentAttendance(student._id);
    const filtered = allAttendance.filter((a) => classIds.includes(a.classId));
    res.json(success(filtered));
  })
);

router.get(
  '/attendance/flagged',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    const taClasses = await classService.getTAClasses(taId);
    const classIds = taClasses.map((c) => c.id);
    const allFlagged = await attendanceService.getFlaggedAttendance();
    const filtered = allFlagged.filter((a) => classIds.includes(a.classId));
    res.json(success(filtered));
  })
);

router.get(
  '/attendance/pending',
  asyncHandler(async (req, res) => {
    const { taId } = req.query;
    const taClasses = await classService.getTAClasses(taId);
    const classIds = taClasses.map((c) => c.id);
    const allPending = await attendanceService.getPendingTAVerification();
    const filtered = allPending.filter((a) => classIds.includes(a.classId));
    res.json(success(filtered));
  })
);

router.put(
  '/attendance/:attendanceId/verify',
  asyncHandler(async (req, res) => {
    const { taId, notes } = req.query;
    const approved = req.query.approved === 'true';
    const attendance = await attendanceService.getAttendanceById(req.params.attendanceId);
    if (!attendance) throw new Error(`Attendance not found: ${req.params.attendanceId}`);
    if (!(await classService.taHasAccessToClass(taId, attendance.classId))) {
      return res.status(403).json(errorResponse('Access denied: You are not assigned to this class', 'ACCESS_DENIED'));
    }
    const verified = await attendanceService.taVerify(req.params.attendanceId, approved, notes);
    res.json(success(verified, approved ? 'Final approval granted' : 'Attendance rejected'));
  })
);

router.put(
  '/attendance/:attendanceId/flag',
  asyncHandler(async (req, res) => {
    const { taId, reason } = req.query;
    const flagged = req.query.flagged === 'true';
    const attendance = await attendanceService.getAttendanceById(req.params.attendanceId);
    if (!attendance) throw new Error(`Attendance not found: ${req.params.attendanceId}`);
    if (!(await classService.taHasAccessToClass(taId, attendance.classId))) {
      return res.status(403).json(errorResponse('Access denied', 'ACCESS_DENIED'));
    }
    const result = await attendanceService.flagProxy(req.params.attendanceId, flagged, reason);
    res.json(success(result, 'Proxy flag updated'));
  })
);

router.get(
  '/:taId',
  asyncHandler(async (req, res) => {
    const ta = await User.findById(req.params.taId);
    if (!ta) throw new Error('TA not found');
    res.json(success(ta.toJSON()));
  })
);

export default router;
