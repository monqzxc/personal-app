import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { LocalDatabase } from '../storage/localDatabase';
import { LocalTaskRepository } from '../repositories/taskRepository';
import { LocalCalendarRepository } from '../repositories/calendarRepository';
import { LocalSettingsRepository } from '../repositories/settingsRepository';
import type { CalendarRepository, SettingsRepository, TaskRepository } from '../repositories/contracts';
import { TaskService } from '../features/tasks/taskService';
import { CalendarService } from './calendarService';
import { LocalLifeRepository } from '../repositories/lifeRepository';
import { LocalFinanceRepository, type FinanceRepository } from '../repositories/financeRepository';
import { LifeService } from './lifeService';

// Composition root: swap these adapters for Laravel API repositories when Phase 5 begins.
const database = new LocalDatabase(AsyncStorage);
const taskRepository: TaskRepository = new LocalTaskRepository(database);
const calendarRepository: CalendarRepository = new LocalCalendarRepository(database);
export const settingsRepository: SettingsRepository = new LocalSettingsRepository(database);
export const taskService = new TaskService(taskRepository, randomUUID);
export const calendarService = new CalendarService(calendarRepository, randomUUID);
export const createId = randomUUID;
export const lifeService = new LifeService(new LocalLifeRepository(database), randomUUID);
export const financeRepository: FinanceRepository = new LocalFinanceRepository(database);
