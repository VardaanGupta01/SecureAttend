import { randomUUID } from 'crypto';
import { CourseClass } from '../models/CourseClass.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

export async function createClass(professorId, request) {
  const person = await User.findById(professorId);
  if (!person) throw new Error(`Professor not found: ${professorId}`);
  if (person.role !== 'PROFESSOR') throw new Error(`User is not a professor: ${professorId}`);

  if (request.code) {
    const existing = await CourseClass.findOne({ code: request.code, professorId });
    if (existing) throw new Error(`Class with code ${request.code} already exists for this professor`);
  }

  const courseClass = new CourseClass({
    _id: randomUUID(),
    code: request.code,
    title: request.title,
    description: request.description,
    professorId,
    semester: request.semester,
    credits: request.credits,
    schedule: request.schedule,
    location: request.location,
    latitude: request.latitude,
    longitude: request.longitude,
    wifiSSID: request.wifiSSID,
    active: true,
  });
  return (await courseClass.save()).toJSON();
}

export async function getProfessorClasses(professorId) {
  const classes = await CourseClass.find({ professorId, active: true });
  return classes.map((c) => c.toJSON());
}

export async function getClassById(classId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  return courseClass.toJSON();
}

export async function updateClass(classId, professorId, request) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  if (courseClass.professorId !== professorId) {
    throw new Error('Unauthorized: You can only update your own classes');
  }

  const fields = ['code', 'title', 'description', 'semester', 'credits', 'schedule', 'location', 'latitude', 'longitude', 'wifiSSID'];
  for (const field of fields) {
    if (request[field] != null) courseClass[field] = request[field];
  }

  return (await courseClass.save()).toJSON();
}

export async function deleteClass(classId, professorId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  if (courseClass.professorId !== professorId) {
    throw new Error('Unauthorized: You can only delete your own classes');
  }

  await Session.deleteMany({ classId });
  await CourseClass.findByIdAndDelete(classId);
}

export async function assignTAsToClass(classId, professorId, taIds) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  if (courseClass.professorId !== professorId) {
    throw new Error('Unauthorized: You can only assign TAs to your own classes');
  }

  for (const taId of taIds) {
    const person = await User.findById(taId);
    if (!person) throw new Error(`TA not found: ${taId}`);
    if (person.role !== 'TA') throw new Error(`User is not a TA: ${taId}`);
    if (person.supervisorProfessorId !== professorId) {
      throw new Error(`TA does not belong to this professor: ${taId}`);
    }
  }

  courseClass.taIds = taIds;
  return (await courseClass.save()).toJSON();
}

export async function getTAClasses(taId) {
  const classes = await CourseClass.find({ taIds: taId });
  return classes.map((c) => c.toJSON());
}

export async function taHasAccessToClass(taId, classId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) return false;
  return courseClass.taIds?.includes(taId) ?? false;
}

export async function unenrollStudent(classId, studentId, professorId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  if (courseClass.professorId !== professorId) {
    throw new Error('Unauthorized: You can only unenroll students from your own classes');
  }
  if (!courseClass.studentIds.includes(studentId)) {
    throw new Error('Student is not enrolled in this class');
  }
  courseClass.studentIds = courseClass.studentIds.filter((id) => id !== studentId);
  await courseClass.save();
}

export async function unenrollTA(classId, taId, professorId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) throw new Error(`Class not found: ${classId}`);
  if (courseClass.professorId !== professorId) {
    throw new Error('Unauthorized: You can only unenroll TAs from your own classes');
  }
  if (!courseClass.taIds.includes(taId)) {
    throw new Error('TA is not assigned to this class');
  }
  courseClass.taIds = courseClass.taIds.filter((id) => id !== taId);
  await courseClass.save();
}
