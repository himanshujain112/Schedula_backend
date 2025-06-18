import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Appointment } from './appointment.entity';
import { Timeslot } from './timeslot.entity';

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  doctor_id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  specialization: string;

  @Column({ type: 'int', default: 0 })
  experience_years: number;

  @Column({ type: 'text', nullable: true })
  education: string;

  @Column({ type: 'text', nullable: true })
  clinic_name: string;

  @Column({ type: 'text', nullable: true })
  clinic_address: string;

  @Column({ nullable: true })
  available_days: string;

  @Column({ nullable: true })
  available_time_slots: string;

  @Column({ nullable: true, type: 'text' })
  hashed_refresh_token: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => Timeslot, (slot) => slot.doctor)
  timeslots: Timeslot[];
}
