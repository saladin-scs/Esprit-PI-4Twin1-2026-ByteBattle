/* eslint-disable prettier/prettier */
import 'express';
import { File } from 'multer';

declare global {
  namespace Express {
    export type MulterFile = File;
  }
}