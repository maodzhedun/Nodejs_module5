// src/controllers/studentsController.js

import { Student } from '../models/student.js';
import createHttpError from 'http-errors';

// get all students
// export const getStudents = async (req, res) => {
//   const students = await Student.find();
//   res.status(200).json(students);
// };

export const getStudents = async (req, res) => {
  // Get parameters from pagination
  const {
    page = 1,
    perPage = 10,
    gender,
    minAvgMark,
    sortBy = '_id',
    sortOrder = 'asc',
  } = req.query;


  const skip = (page - 1) * perPage;

  // Create a base query to collection
  // const studentsQuery = Student.find();
  // Додаємо критерій пошуку тільки студентів поточного користувача
  const studentsQuery = Student.find({ userId: req.user._id });

  // Apply filters if provided
  if (gender) {
    studentsQuery.where('gender').equals(gender);
  }
  if (minAvgMark) {
    studentsQuery.where('avgMark').gte(minAvgMark);
  }

  // Execute the query and count total items in parallel
  const [totalItems, students] = await Promise.all([
    studentsQuery.clone().countDocuments(),
    studentsQuery
      .skip(skip)
      .limit(perPage)
      .sort({ [sortBy]: sortOrder }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / perPage);

  res.status(200).json({
    page,
    perPage,
    totalItems,
    totalPages,
    students,
  });
};

// get student by id
export const getStudentById = async (req, res, next) => {
  const { studentId } = req.params;
  // const student = await Student.findById(studentId);
  const student = await Student.findOne({
    _id: studentId,
    userId: req.user._id,
  });

  // if (!student) {
  //   return res.status(404).json({ message: 'Student not found' });
  // }

  if (!student) {
    next(createHttpError(404, 'Student not found'));
    return;
  }

  res.status(200).json(student);
};

// create a new student
export const createStudent = async (req, res) => {
  const student = await Student.create({
    ...req.body,
    // Додаємо властивість userId
    userId: req.user._id,
  });
  res.status(201).json(student);
};

// delete a student
export const deleteStudent = async (req, res, next) => {
  const { studentId } = req.params;
  // const student = await Student.findOneAndDelete({
  //   _id: studentId,
  // });
  const student = await Student.findOneAndDelete({
    _id: studentId,
    // Критерій пошуку по userId
    userId: req.user._id,
  });

  if (!student) {
    next(createHttpError(404, 'Student not found'));
    return;
  }

  res.status(200).send(student);
};

// update a student
export const updateStudent = async (req, res, next) => {
  const { studentId } = req.params;

  // const student = await Student.findOneAndUpdate(
  //   { _id: studentId }, // Search filter Id
  //   req.body,
  //   { new: true }, // Return the updated document
  // );
  const student = await Student.findOneAndUpdate(
    // Критерій пошуку по userId
    { _id: studentId, userId: req.user._id },
    req.body,
    { new: true }
  );

  if (!student) {
    next(createHttpError(404, 'Student not found'));
    return;
  }

  res.status(200).json(student);
};
