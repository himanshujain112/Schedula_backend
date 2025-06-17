import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Doctor } from "./doctor.entity";

@Entity()
export class Timeslot {
    @PrimaryGeneratedColumn()
    slot_id: number;

    @ManyToOne(()=> Doctor, (doctor)=> doctor.timeslots)
    doctor: Doctor;

    @Column()
    day_of_week: string;

    @Column()
    start_time: string;

    @Column()
    end_time: string;
}