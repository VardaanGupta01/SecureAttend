import { Router } from 'express';
import { success, error as errorResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as authService from '../services/authService.js';
import * as classService from '../services/classService.js';

const router = Router();

function authHandler(fn, errorCode) {
  return async (req, res, next) => {
    try {
      const result = await fn(req);
      res.json(result);
    } catch (e) {
      res.status(400).json(errorResponse(e.message, errorCode));
    }
  };
}

router.post(
  '/professor/signup',
  authHandler(async (req) => {
    const response = await authService.professorSignup(req.body);
    return success(response, 'Professor registered successfully');
  }, 'SIGNUP_FAILED')
);

router.post(
  '/professor/login',
  authHandler(async (req) => {
    const response = await authService.professorLogin(req.body);
    return success(response, 'Login successful');
  }, 'LOGIN_FAILED')
);

router.post(
  '/professor/enroll-student',
  authHandler(async (req) => {
    const student = await authService.enrollStudent(req.body);
    return success(student, 'Student enrolled successfully');
  }, 'ENROLLMENT_FAILED')
);

router.post(
  '/professor/create-ta',
  authHandler(async (req) => {
    const ta = await authService.createTA(req.body);
    return success(ta, 'TA created successfully');
  }, 'TA_CREATION_FAILED')
);

router.post(
  '/student/login',
  authHandler(async (req) => {
    const response = await authService.studentLogin(req.body);
    return success(response, 'Login successful');
  }, 'LOGIN_FAILED')
);

router.post(
  '/ta/login',
  authHandler(async (req) => {
    const response = await authService.taLogin(req.body);
    return success(response, 'Login successful');
  }, 'LOGIN_FAILED')
);

// Class creation (separate path matching Java ClassController)
const classRouter = Router();
classRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { professorId } = req.query;
    const courseClass = await classService.createClass(professorId, req.body);
    res.json(success(courseClass, 'Class created successfully'));
  })
);

export { router as authRouter, classRouter };
