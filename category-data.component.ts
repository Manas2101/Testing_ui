import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-category-data',
  templateUrl: './category-data.component.html',
  styleUrls: ['./category-data.component.css']
})
export class CategoryDataComponent implements OnInit {
  categoryForm: FormGroup;
  currentDate: string = '';

  constructor(private fb: FormBuilder) {
    this.categoryForm = this.fb.group({
      categoryCode: ['', Validators.required],
      categoryBusinessName: ['', Validators.required],
      categorySite: ['00001'],
      asAtDate: [''],
      categoryCodeDisplay: [{value: '', disabled: true}],
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
    this.categoryForm.patchValue({
      asAtDate: this.currentDate
    });
  }

  onContinue(): void {
    if (this.categoryForm.valid) {
      console.log('Continue clicked', this.categoryForm.value);
    }
  }

  onFind(): void {
    const formData = this.categoryForm.value;
    console.log('Find clicked', formData);
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      console.log('Form submitted', this.categoryForm.value);
    }
  }

  openDatePicker(): void {
    console.log('Open date picker');
  }
}
