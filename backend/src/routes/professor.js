import { Router } from 'express';
import { success } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as classService from '../services/classService.js';
import * as sessionService from '../services/sessionService.js';
import * as attendanceService from '../services/attendanceService.js';
import { User } from '../models/User.js';

const router = Router();

router.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const classes = await classService.getProfessorClasses(req.query.professorId);
    res.json(success(classes));
  })
);

router.get(
  '/classes/:classId',
  asyncHandler(async (req, res) => {
    const courseClass = await classService.getClassById(req.params.classId);
    res.json(success(courseClass));
  })
);

router.put(
  '/classes/:classId',
  asyncHandler(async (req, res) => {
    const updated = await classService.updateClass(req.params.classId, req.query.professorId, req.body);
    res.json(success(updated, 'Class updated successfully'));
  })
);

router.delete(
  '/classes/:classId',
  asyncHandler(async (req, res) => {
    await classService.deleteClass(req.params.classId, req.query.professorId);
    res.json(success(null, 'Class deleted successfully'));
  })
);

router.get(
  '/classes/:classId/students',
  asyncHandler(async (req, res) => {
    const courseClass = await classService.getClassById(req.params.classId);
    const students = [];
    for (const studentId of courseClass.studentIds || []) {
      const person = await User.findById(studentId);
      if (person) students.push(person.toJSON());
    }
    res.json(success(students));
  })
);

router.get(
  '/tas',
  asyncHandler(async (req, res) => {
    const { professorId } = req.query;
    const allUsers = await User.find({ role: 'TA', supervisorProfessorId: professorId });
    res.json(success(allUsers.map((u) => u.toJSON())));
  })
);

router.put(
  '/classes/:classId/assign-tas',
  asyncHandler(async (req, res) => {
    const updated = await classService.assignTAsToClass(req.params.classId, req.query.professorId, req.body);
    res.json(success(updated, 'TAs assigned successfully'));
  })
);

router.delete(
  '/classes/:classId/students/:studentId',
  asyncHandler(async (req, res) => {
    await classService.unenrollStudent(req.params.classId, req.params.studentId, req.query.professorId);
    res.json(success(null, 'Student unenrolled successfully'));
  })
);

router.delete(
  '/classes/:classId/tas/:taId',
  asyncHandler(async (req, res) => {
    await classService.unenrollTA(req.params.classId, req.params.taId, req.query.professorId);
    res.json(success(null, 'TA unenrolled successfully'));
  })
);

router.post(
  '/classes/:classId/sessions',
  asyncHandler(async (req, res) => {
    const session = await sessionService.createSession({ ...req.body, classId: req.params.classId });
    res.json(success(session, 'Session created successfully'));
  })
);

router.get(
  '/classes/:classId/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await sessionService.getAllSessionsForClass(req.params.classId);
    res.json(success(sessions));
  })
);

router.get(
  '/classes/:classId/sessions/open',
  asyncHandler(async (req, res) => {
    const sessions = await sessionService.getOpenSessionsForClass(req.params.classId);
    res.json(success(sessions || []));
  })
);

router.get(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const session = await sessionService.getSessionById(req.params.sessionId);
    if (!session) return res.status(404).json(success(null));
    res.json(success(session));
  })
);

router.put(
  '/sessions/:sessionId/activate',
  asyncHandler(async (req, res) => {
    const session = await sessionService.activateSession(req.params.sessionId);
    res.json(success(session, 'Session activated'));
  })
);

router.put(
  '/sessions/:sessionId/close',
  asyncHandler(async (req, res) => {
    const session = await sessionService.closeSession(req.params.sessionId);
    res.json(success(session, 'Session closed'));
  })
);

router.put(
  '/sessions/:sessionId/rotate-qr',
  asyncHandler(async (req, res) => {
    const session = await sessionService.rotateQrCode(req.params.sessionId);
    res.json(success(session, 'QR code rotated successfully'));
  })
);

router.put(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const session = await sessionService.updateSession(req.params.sessionId, req.body);
    res.json(success(session, 'Session updated successfully'));
  })
);

router.delete(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    await sessionService.deleteSession(req.params.sessionId);
    res.json(success(null, 'Session deleted successfully'));
  })
);

router.put(
  '/sessions/:sessionId/headcount',
  asyncHandler(async (req, res) => {
    const session = await sessionService.updateHeadcount(req.params.sessionId, parseInt(req.query.headcount, 10));
    res.json(success(session, 'Headcount updated'));
  })
);

router.get(
  '/sessions/:sessionId/attendance',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getSessionAttendance(req.params.sessionId);
    res.json(success(attendance));
  })
);

router.get(
  '/sessions/:sessionId/attendance/pending',
  asyncHandler(async (req, res) => {
    const pending = await attendanceService.getPendingProfessorVerification(req.params.sessionId);
    res.json(success(pending));
  })
);

router.put(
  '/attendance/:attendanceId/verify',
  asyncHandler(async (req, res) => {
    const approved = req.query.approved === 'true';
    const attendance = await attendanceService.professorVerify(req.params.attendanceId, approved, req.query.notes);
    res.json(success(attendance, approved ? 'Attendance approved' : 'Attendance rejected'));
  })
);

router.put(
  '/attendance/:attendanceId/flag',
  asyncHandler(async (req, res) => {
    const flagged = req.query.flagged === 'true';
    const attendance = await attendanceService.flagProxy(req.params.attendanceId, flagged, req.query.reason);
    res.json(success(attendance, 'Proxy flag updated'));
  })
);

router.get(
  '/attendance/flagged',
  asyncHandler(async (req, res) => {
    const flagged = await attendanceService.getFlaggedAttendance();
    res.json(success(flagged));
  })
);

router.put(
  '/profile/picture',
  asyncHandler(async (req, res) => {
    const person = await User.findById(req.query.userId);
    if (!person) throw new Error('User not found');
    person.profilePictureBase64 = req.body.profilePictureBase64;
    person.updatedAt = new Date();
    await person.save();
    res.json(success(person.toJSON(), 'Profile picture updated successfully'));
  })
);

router.get(
  '/:professorId',
  asyncHandler(async (req, res) => {
    const professor = await User.findById(req.params.professorId);
    if (!professor) throw new Error('Professor not found');
    res.json(success(professor.toJSON()));
  })
);

export default router;
