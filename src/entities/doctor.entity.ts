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

  @Column({ unique: true })
  email: string;

  @Column()
  phoneNumber: string;

  @Column()
  specialization: string;

  @Column()
  experience_years: number;

  @Column()
  education: string;

  @Column()
  clinic_name: string;

  @Column()
  clinic_address: string;

  @Column()
  available_days: string;

  @Column()
  available_time_slots: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => Timeslot, (slot) => slot.doctor)
  timeslots: Timeslot[];
}
