// src/validations/studentsValidation.js

import { Joi, Segments } from 'celebrate';
import { isValidObjectId } from 'mongoose';

// Validation schema for query parameters in getStudents
export const getStudentsSchema = {
  [Segments.QUERY]: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    perPage: Joi.number().integer().min(5).max(20).default(10),
    gender: Joi.string().valid('male', 'female', 'other'),
    minAvgMark: Joi.number().positive(),
    sortBy: Joi.string().valid("_id", "name", "age", "avgMark").default("_id"),
    sortOrder: Joi.string().valid("asc", "desc").default("asc"),
  }),
};

// Custom validator for ObjectId
const objectIdValidator = (value, helpers) => {
  return !isValidObjectId(value) ? helpers.message('Invalid id format') : value;
};

// Validation schema for studentId parameter
export const studentIdParamSchema = {
  [Segments.PARAMS]: Joi.object({
    studentId: Joi.string().custom(objectIdValidator).required(),
  }),
};

export const createStudentSchema = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(3).max(30).required().messages({
      'string.base': 'Name must be a string',
      'string.min': 'Name should have at least {#limit} characters',
      'string.max': 'Name should have at most {#limit} characters',
      'any.required': 'Name is required',
    }),
    age: Joi.number().integer().min(12).max(65).required().messages({
      'number.base': 'Age must be a number',
      'number.min': 'Age must be at least {#limit}',
      'number.max': 'Age must be at most {#limit}',
      'any.required': 'Age is required',
    }),
    gender: Joi.string().valid('male', 'female', 'other').required().messages({
      'any.only': 'Gender must be one of: male, female, or other',
      'any.required': 'Gender is required',
    }),
    avgMark: Joi.number().min(2).max(12).required().messages({
      'number.base': 'Average mark must be a number',
      'number.min': 'Average mark must be at least {#limit}',
      'number.max': 'Average mark must be at most {#limit}',
      'any.required': 'Average mark is required',
    }),
    onDuty: Joi.boolean().messages({
      'boolean.base': 'onDuty must be a boolean value',
    }),
  }),
};

export const updateStudentSchema = {
  [Segments.PARAMS]: Joi.object({
    studentId: Joi.string().custom(objectIdValidator).required(),
  }),
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(3).max(30),
    age: Joi.number().integer().min(12).max(65),
    gender: Joi.string().valid('male', 'female', 'other'),
    avgMark: Joi.number().min(2).max(12),
    onDuty: Joi.boolean(),
  }).min(1), // instead of required() use min(1) to ensure at least one field is provided
};
