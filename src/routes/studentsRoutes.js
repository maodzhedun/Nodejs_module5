// src/routes/studentsRoutes.js

import { Router } from 'express';
import { celebrate } from 'celebrate';
import {
  getStudents,
  getStudentById,
  createStudent,
  deleteStudent,
  updateStudent,
} from '../controllers/studentsController.js';
import {
  getStudentsSchema,
  createStudentSchema,
  studentIdParamSchema,
  updateStudentSchema,
} from '../validations/studentsValidation.js';

// 1. Імпортуємо middleware
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// 2. Додаємо middleware до всіх шляхів, що починаються з /students
router.use("/students", authenticate);

router.get('/students', celebrate(getStudentsSchema), getStudents);
router.get(
  '/students/:studentId',
  celebrate(studentIdParamSchema),
  getStudentById,
);
router.post('/students', celebrate(createStudentSchema), createStudent);
router.delete(
  '/students/:studentId',
  celebrate(studentIdParamSchema),
  deleteStudent,
);
router.patch(
  '/students/:studentId',
  celebrate(updateStudentSchema),
  updateStudent,
);

export default router;
