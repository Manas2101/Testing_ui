import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-grouping-data',
  templateUrl: './grouping-data.component.html',
  styleUrls: ['./grouping-data.component.scss']
})
export class GroupingDataComponent implements OnInit {
  groupingDataForm: FormGroup;
  currentDate: string = '';
  showJuniorInfo: boolean = false;
  showSeniorInfo: boolean = false;

  constructor(private fb: FormBuilder) {
    this.groupingDataForm = this.fb.group({
      groupingCode: ['', Validators.required],
      groupingSite: ['00000'],
      asAtDate: [''],
      categorySite: ['00000'],
      categoryCode: [{value: '', disabled: true}],
      categoryKey: [{value: '', disabled: true}]
    });
  }

  ngOnInit(): void {
    this.setCurrentDate();
  }

  setCurrentDate(): void {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    this.currentDate = `${day}/${month}/${year}`;
    this.groupingDataForm.patchValue({
      asAtDate: this.currentDate
    });
  }

  onContinue(): void {
    if (this.groupingDataForm.valid) {
      console.log('Continue clicked', this.groupingDataForm.value);
    }
  }

  onFind(): void {
    const formData = this.groupingDataForm.value;
    console.log('Find clicked', formData);
  }

  onJunior(): void {
    this.showJuniorInfo = true;
    this.showSeniorInfo = false;
    console.log('Junior clicked');
  }

  onSenior(): void {
    this.showSeniorInfo = true;
    this.showJuniorInfo = false;
    console.log('Senior clicked');
  }

  onSubmit(): void {
    if (this.groupingDataForm.valid) {
      console.log('Form submitted', this.groupingDataForm.value);
    }
  }

  openDatePicker(): void {
    console.log('Open date picker');
  }
}
