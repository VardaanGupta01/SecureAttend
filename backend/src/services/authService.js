import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { CourseClass } from '../models/CourseClass.js';
import { config } from '../config/index.js';

export function generateToken(user) {
  const payload = {
    userId: user._id || user.id || user.userId,
    name: user.name,
    role: user.role,
    email: user.email || '',
    studentNumber: user.studentNumber || undefined,
    taId: user.taId || undefined,
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

export function setAuthCookie(res, token) {
  res.cookie('token', token, getCookieOptions());
}

export function clearAuthCookie(res) {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie('token', options);
}

function toAuthResponse(user, token) {
  return {
    token,
    userId: user._id,
    name: user.name,
    role: user.role,
    email: user.email || '',
    studentNumber: user.studentNumber || undefined,
    taId: user.taId || undefined,
  };
}

export async function professorSignup(request) {
  const existing = await User.findOne({ email: request.email });
  if (existing) throw new Error('Email already registered');

  const professor = new User({
    _id: randomUUID(),
    name: request.name,
    email: request.email,
    password: await bcrypt.hash(request.password, 10),
    role: 'PROFESSOR',
    department: request.department,
    active: true,
  });
  await professor.save();

  const token = generateToken(professor);
  return toAuthResponse(professor, token);
}

export async function professorLogin(request) {
  const person = await User.findOne({ email: request.username });
  if (!person || !(await bcrypt.compare(request.password, person.password))) {
    throw new Error('Invalid email or password');
  }
  if (person.role !== 'PROFESSOR') throw new Error('Not authorized as professor');

  const token = generateToken(person);
  return toAuthResponse(person, token);
}

export async function enrollStudent(request) {
  const courseClass = await CourseClass.findById(request.classId);
  if (!courseClass) throw new Error('Class not found');

  let student = await User.findOne({ studentNumber: request.rollNumber });

  if (student) {
    if (student.role !== 'STUDENT') {
      throw new Error('Roll number is already used by a non-student user');
    }
    if (request.faceImageBase64) {
      student.faceImageBase64 = request.faceImageBase64;
      await student.save();
    }
    if (courseClass.studentIds.includes(student._id)) {
      return student.toJSON();
    }
  } else {
    student = new User({
      _id: randomUUID(),
      name: request.name,
      studentNumber: request.rollNumber,
      password: await bcrypt.hash(request.password, 10),
      role: 'STUDENT',
      email: request.email,
      major: request.major,
      year: request.year,
      faceImageBase64: request.faceImageBase64 || undefined,
      active: true,
    });
    await student.save();
  }

  if (!courseClass.studentIds.includes(student._id)) {
    courseClass.studentIds.push(student._id);
    await courseClass.save();
  }

  return student.toJSON();
}

export async function studentLogin(request) {
  const person = await User.findOne({ studentNumber: request.username });
  if (!person || !(await bcrypt.compare(request.password, person.password))) {
    throw new Error('Invalid roll number or password');
  }
  if (person.role !== 'STUDENT') throw new Error('Not authorized as student');

  const token = generateToken(person);
  return toAuthResponse(person, token);
}

export async function createTA(request) {
  const existing = await User.findOne({ taId: request.taId });
  if (existing) throw new Error('TA ID already exists');

  const ta = new User({
    _id: randomUUID(),
    name: request.name,
    taId: request.taId,
    password: await bcrypt.hash(request.password, 10),
    role: 'TA',
    email: request.email,
    department: request.department,
    supervisorProfessorId: request.supervisorProfessorId,
    profilePictureBase64: request.profilePictureBase64 || undefined,
    active: true,
  });
  await ta.save();
  return ta.toJSON();
}

export async function taLogin(request) {
  const person = await User.findOne({ taId: request.username });
  if (!person || !(await bcrypt.compare(request.password, person.password))) {
    throw new Error('Invalid TA ID or password');
  }
  if (person.role !== 'TA') throw new Error('Not authorized as TA');

  const token = generateToken(person);
  return toAuthResponse(person, token);
}

export function verifyToken(token) {
  if (!token) throw new Error('Token required');
  return jwt.verify(token, config.jwt.secret);
}
